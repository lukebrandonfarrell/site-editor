import pg from "pg";
import { applyVersionContent, promoteDrafts } from "../content/transition.js";
import {
  DatabaseUnavailableError,
  SchemaMissingError,
  SchemaOutdatedError,
  isDbUnavailable,
} from "../errors.js";
import { ContentError } from "../errors.js";
import type { ContentMap, PublishResult, SpotRecord, TextContent, VersionRecord, VersionSummary } from "../types.js";
import { isTextContent, sanitizeContentMap } from "../validate.js";
import type { AuthStore, ContentStore, RateLimitStore } from "./types.js";

const { Pool } = pg;
type PoolClient = pg.PoolClient;
type Queryable = Pick<PoolClient, "query">;

const globalForPg = globalThis as { __siteEditorPool?: pg.Pool };

export function getPool(databaseUrl: string): pg.Pool {
  if (!globalForPg.__siteEditorPool) {
    const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(databaseUrl);
    globalForPg.__siteEditorPool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 20_000,
      query_timeout: 2500,
      ssl: local ? undefined : { rejectUnauthorized: false },
    });
  }
  return globalForPg.__siteEditorPool;
}

export async function closePool(): Promise<void> {
  if (globalForPg.__siteEditorPool) {
    await globalForPg.__siteEditorPool.end();
    globalForPg.__siteEditorPool = undefined;
  }
}

function mapPgError(error: unknown): never {
  if (error && typeof error === "object" && "code" in error && error.code === "42P01") {
    throw new SchemaMissingError();
  }
  if (error && typeof error === "object" && "code" in error && error.code === "42703") {
    throw new SchemaOutdatedError(
      "The database is missing a column this version needs. Run npx site-editor migrate.",
    );
  }
  if (isDbUnavailable(error)) {
    const message = error instanceof Error ? error.message : "Database is unreachable";
    throw new DatabaseUnavailableError(message, { cause: error });
  }
  throw error;
}

async function query<T extends pg.QueryResultRow>(
  client: Queryable,
  text: string,
  values: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  try {
    return await client.query<T>(text, values);
  } catch (error) {
    mapPgError(error);
  }
}

function asText(value: unknown): TextContent | null {
  if (!isTextContent(value)) return null;
  return { type: "text", value: value.value };
}

function spotFromRow(row: {
  spot_id: string;
  draft: unknown;
  published: unknown;
  updated_by?: string | null;
}): SpotRecord {
  const draft = asText(row.draft) ?? { type: "text", value: "" };
  return {
    spotId: row.spot_id,
    draft,
    published: asText(row.published),
    updatedBy: row.updated_by ?? null,
  };
}

async function withTransaction<T>(pool: pg.Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  let client: PoolClient;
  try {
    client = await pool.connect();
  } catch (error) {
    mapPgError(error);
  }
  try {
    await query(client, "BEGIN");
    const result = await fn(client);
    await query(client, "COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The original error is the one callers need.
    }
    throw error;
  } finally {
    client.release();
  }
}

async function lockSite(client: Queryable, siteId: string): Promise<void> {
  await query(client, `INSERT INTO site_editor_sites (site_id) VALUES ($1) ON CONFLICT DO NOTHING`, [
    siteId,
  ]);
  await query(client, `SELECT site_id FROM site_editor_sites WHERE site_id = $1 FOR UPDATE`, [siteId]);
}

async function selectSpots(client: Queryable, siteId: string): Promise<SpotRecord[]> {
  const result = await query<{
    spot_id: string;
    draft: unknown;
    published: unknown;
    updated_by: string | null;
  }>(
    client,
    `SELECT spot_id, draft, published, updated_by FROM site_editor_spots WHERE site_id = $1 ORDER BY spot_id FOR UPDATE`,
    [siteId],
  );
  return result.rows.map(spotFromRow);
}

async function writeSpots(client: Queryable, siteId: string, spots: SpotRecord[]): Promise<void> {
  const ids = spots.map((spot) => spot.spotId);
  if (ids.length === 0) {
    await query(client, `DELETE FROM site_editor_spots WHERE site_id = $1`, [siteId]);
  } else {
    await query(
      client,
      `DELETE FROM site_editor_spots WHERE site_id = $1 AND NOT (spot_id = ANY($2::text[]))`,
      [siteId, ids],
    );
  }
  for (const spot of spots) {
    await query(
      client,
      `INSERT INTO site_editor_spots (site_id, spot_id, draft, published, updated_by)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
       ON CONFLICT (site_id, spot_id) DO UPDATE
       SET draft = EXCLUDED.draft,
           published = EXCLUDED.published,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
      [
        siteId,
        spot.spotId,
        JSON.stringify(spot.draft),
        spot.published ? JSON.stringify(spot.published) : null,
        spot.updatedBy,
      ],
    );
  }
}

async function insertVersion(
  client: Queryable,
  siteId: string,
  content: ContentMap,
  actor: string | null,
  restoredFrom: number | null,
): Promise<PublishResult> {
  const next = await query<{ version: number }>(
    client,
    `SELECT COALESCE(MAX(version), 0) + 1 AS version FROM site_editor_versions WHERE site_id = $1`,
    [siteId],
  );
  const version = Number(next.rows[0]?.version ?? 1);
  const inserted = await query<{ created_at: Date }>(
    client,
    `INSERT INTO site_editor_versions (site_id, version, content, created_by, restored_from)
     VALUES ($1, $2, $3::jsonb, $4, $5)
     RETURNING created_at`,
    [siteId, version, JSON.stringify(content), actor, restoredFrom],
  );
  const createdAt = inserted.rows[0]?.created_at ?? new Date();
  return {
    version,
    content,
    createdAt: createdAt.toISOString(),
  };
}

export class PostgresContentStore implements ContentStore {
  constructor(private readonly pool: pg.Pool) {}

  async getSpot(siteId: string, spotId: string): Promise<SpotRecord | null> {
    const result = await query<{
      spot_id: string;
      draft: unknown;
      published: unknown;
      updated_by: string | null;
    }>(
      this.pool,
      `SELECT spot_id, draft, published, updated_by FROM site_editor_spots WHERE site_id = $1 AND spot_id = $2`,
      [siteId, spotId],
    );
    const row = result.rows[0];
    return row ? spotFromRow(row) : null;
  }

  async insertSpot(siteId: string, spot: SpotRecord): Promise<boolean> {
    return withTransaction(this.pool, async (client) => {
      await query(client, `INSERT INTO site_editor_sites (site_id) VALUES ($1) ON CONFLICT DO NOTHING`, [
        siteId,
      ]);
      const result = await query(
        client,
        `INSERT INTO site_editor_spots (site_id, spot_id, draft, published, updated_by)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
         ON CONFLICT (site_id, spot_id) DO NOTHING
         RETURNING spot_id`,
        [
          siteId,
          spot.spotId,
          JSON.stringify(spot.draft),
          spot.published ? JSON.stringify(spot.published) : null,
          spot.updatedBy,
        ],
      );
      return result.rowCount === 1;
    });
  }

  async updateDraft(siteId: string, spotId: string, draft: TextContent, actor: string): Promise<boolean> {
    const result = await query(
      this.pool,
      `UPDATE site_editor_spots
       SET draft = $3::jsonb, updated_by = $4, updated_at = now()
       WHERE site_id = $1 AND spot_id = $2
       RETURNING spot_id`,
      [siteId, spotId, JSON.stringify(draft), actor],
    );
    return result.rowCount === 1;
  }

  async listSpots(siteId: string): Promise<SpotRecord[]> {
    const result = await query<{
      spot_id: string;
      draft: unknown;
      published: unknown;
      updated_by: string | null;
    }>(
      this.pool,
      `SELECT spot_id, draft, published, updated_by FROM site_editor_spots WHERE site_id = $1 ORDER BY spot_id`,
      [siteId],
    );
    return result.rows.map(spotFromRow);
  }

  async countSpots(siteId: string): Promise<number> {
    const result = await query<{ count: string }>(
      this.pool,
      `SELECT COUNT(*)::text AS count FROM site_editor_spots WHERE site_id = $1`,
      [siteId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async publish(siteId: string, actor: string | null): Promise<PublishResult> {
    return withTransaction(this.pool, async (client) => {
      await lockSite(client, siteId);
      const spots = await selectSpots(client, siteId);
      const promoted = promoteDrafts(spots);
      await writeSpots(client, siteId, promoted.spots);
      return insertVersion(client, siteId, promoted.content, actor, null);
    });
  }

  async getVersion(siteId: string, version: number): Promise<VersionRecord | null> {
    const result = await query<{
      version: number;
      content: unknown;
      created_by: string | null;
      restored_from: number | null;
      created_at: Date;
    }>(
      this.pool,
      `SELECT version, content, created_by, restored_from, created_at
       FROM site_editor_versions WHERE site_id = $1 AND version = $2`,
      [siteId, version],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      version: Number(row.version),
      content: sanitizeContentMap(row.content),
      actor: row.created_by,
      restoredFrom: row.restored_from === null ? null : Number(row.restored_from),
      createdAt: row.created_at.toISOString(),
    };
  }

  async listVersions(siteId: string, limit: number): Promise<VersionSummary[]> {
    const result = await query<{
      version: number;
      created_by: string | null;
      restored_from: number | null;
      created_at: Date;
    }>(
      this.pool,
      `SELECT version, created_by, restored_from, created_at
       FROM site_editor_versions
       WHERE site_id = $1
       ORDER BY version DESC
       LIMIT $2`,
      [siteId, limit],
    );
    return result.rows.map((row) => ({
      version: Number(row.version),
      createdAt: row.created_at.toISOString(),
      actor: row.created_by,
      restoredFrom: row.restored_from === null ? null : Number(row.restored_from),
    }));
  }

  async restore(siteId: string, version: number, actor: string | null): Promise<PublishResult> {
    return withTransaction(this.pool, async (client) => {
      await lockSite(client, siteId);
      const historical = await query<{ content: unknown }>(
        client,
        `SELECT content FROM site_editor_versions WHERE site_id = $1 AND version = $2`,
        [siteId, version],
      );
      const row = historical.rows[0];
      if (!row) {
        throw new ContentError("version_not_found", `Version ${version} was not found.`);
      }
      const content = sanitizeContentMap(row.content);
      const spots = await selectSpots(client, siteId);
      await writeSpots(client, siteId, applyVersionContent(spots, content));
      return insertVersion(client, siteId, content, actor, version);
    });
  }
}

export class PostgresAuthStore implements AuthStore {
  constructor(private readonly pool: pg.Pool) {}

  async saveMagicLink(input: {
    tokenHash: string;
    siteId: string;
    email: string;
    expiresAt: Date;
  }): Promise<void> {
    await query(
      this.pool,
      `INSERT INTO site_editor_magic_links (token_hash, site_id, email, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [input.tokenHash, input.siteId, input.email, input.expiresAt],
    );
  }

  async deleteMagicLink(tokenHash: string): Promise<void> {
    await query(this.pool, `DELETE FROM site_editor_magic_links WHERE token_hash = $1`, [tokenHash]);
  }

  async consumeMagicLink(tokenHash: string, now: Date) {
    const result = await query<{ site_id: string; email: string }>(
      this.pool,
      `UPDATE site_editor_magic_links
       SET used_at = $2
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2
       RETURNING site_id, email`,
      [tokenHash, now],
    );
    const row = result.rows[0];
    return row ? { siteId: row.site_id, email: row.email } : null;
  }

  async saveSession(input: {
    tokenHash: string;
    siteId: string;
    email: string;
    expiresAt: Date;
  }): Promise<void> {
    await query(
      this.pool,
      `INSERT INTO site_editor_sessions (token_hash, site_id, email, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [input.tokenHash, input.siteId, input.email, input.expiresAt],
    );
  }

  async getSession(tokenHash: string, now: Date) {
    const result = await query<{ site_id: string; email: string }>(
      this.pool,
      `SELECT site_id, email FROM site_editor_sessions
       WHERE token_hash = $1 AND expires_at > $2`,
      [tokenHash, now],
    );
    const row = result.rows[0];
    return row ? { siteId: row.site_id, email: row.email } : null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await query(this.pool, `DELETE FROM site_editor_sessions WHERE token_hash = $1`, [tokenHash]);
  }
}

export class PostgresRateLimitStore implements RateLimitStore {
  constructor(private readonly pool: pg.Pool) {}

  async consume(bucket: string, nowMs: number, windowMs: number, limit: number) {
    const result = await query<{ hits: number; window_start_ms: string }>(
      this.pool,
      `INSERT INTO site_editor_rate_limits (bucket, hits, window_start)
       VALUES ($1, 1, to_timestamp($2 / 1000.0))
       ON CONFLICT (bucket) DO UPDATE
       SET hits = CASE
             WHEN site_editor_rate_limits.window_start <= to_timestamp($2 / 1000.0) - ($3 * interval '1 millisecond')
             THEN 1
             ELSE site_editor_rate_limits.hits + 1
           END,
           window_start = CASE
             WHEN site_editor_rate_limits.window_start <= to_timestamp($2 / 1000.0) - ($3 * interval '1 millisecond')
             THEN to_timestamp($2 / 1000.0)
             ELSE site_editor_rate_limits.window_start
           END
       RETURNING hits,
                 (EXTRACT(EPOCH FROM window_start) * 1000)::text AS window_start_ms`,
      [bucket, nowMs, windowMs],
    );
    const row = result.rows[0];
    const hits = Number(row?.hits ?? 1);
    const windowStartMs = Number(row?.window_start_ms ?? nowMs);
    if (hits > limit) {
      return { allowed: false, retryAfterMs: Math.max(0, windowMs - (nowMs - windowStartMs)) };
    }
    return { allowed: true, retryAfterMs: 0 };
  }
}

export function createPostgresStores(databaseUrl: string) {
  const pool = getPool(databaseUrl);
  return {
    content: new PostgresContentStore(pool),
    auth: new PostgresAuthStore(pool),
    rateLimit: new PostgresRateLimitStore(pool),
  };
}
