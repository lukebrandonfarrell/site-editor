import { ContentError } from "../errors.js";
import { applyVersionContent, promoteDrafts } from "../content/transition.js";
import { consumeFixedWindow } from "../rate-limit.js";
import { sanitizeContentMap } from "../validate.js";
function cloneContent(content) {
    return { type: "text", value: content.value };
}
function cloneSpot(spot) {
    return {
        spotId: spot.spotId,
        draft: cloneContent(spot.draft),
        published: spot.published ? cloneContent(spot.published) : null,
        updatedBy: spot.updatedBy,
    };
}
export class MemoryContentStore {
    sites = new Map();
    site(siteId) {
        let data = this.sites.get(siteId);
        if (!data) {
            data = { spots: new Map(), versions: [] };
            this.sites.set(siteId, data);
        }
        return data;
    }
    async getSpot(siteId, spotId) {
        const spot = this.site(siteId).spots.get(spotId);
        return spot ? cloneSpot(spot) : null;
    }
    async insertSpot(siteId, spot) {
        const data = this.site(siteId);
        if (data.spots.has(spot.spotId))
            return false;
        data.spots.set(spot.spotId, cloneSpot(spot));
        return true;
    }
    async updateDraft(siteId, spotId, draft, actor) {
        const spot = this.site(siteId).spots.get(spotId);
        if (!spot)
            return false;
        spot.draft = cloneContent(draft);
        spot.updatedBy = actor;
        return true;
    }
    async listSpots(siteId) {
        return [...this.site(siteId).spots.values()].map(cloneSpot);
    }
    async countSpots(siteId) {
        return this.site(siteId).spots.size;
    }
    async publish(siteId, actor) {
        const data = this.site(siteId);
        const promoted = promoteDrafts([...data.spots.values()]);
        data.spots = new Map(promoted.spots.map((spot) => [spot.spotId, spot]));
        return this.appendVersion(data, promoted.content, actor, null);
    }
    async getVersion(siteId, version) {
        const found = this.site(siteId).versions.find((item) => item.version === version);
        if (!found)
            return null;
        return {
            ...found,
            content: sanitizeContentMap(found.content),
        };
    }
    async listVersions(siteId, limit) {
        return [...this.site(siteId).versions]
            .sort((a, b) => b.version - a.version)
            .slice(0, limit)
            .map(({ version, createdAt, actor, restoredFrom }) => ({
            version,
            createdAt,
            actor,
            restoredFrom,
        }));
    }
    async restore(siteId, version, actor) {
        const data = this.site(siteId);
        const historical = data.versions.find((item) => item.version === version);
        if (!historical) {
            throw new ContentError("version_not_found", `Version ${version} was not found.`);
        }
        const nextSpots = applyVersionContent([...data.spots.values()], historical.content);
        data.spots = new Map(nextSpots.map((spot) => [spot.spotId, spot]));
        return this.appendVersion(data, sanitizeContentMap(historical.content), actor, version);
    }
    appendVersion(data, content, actor, restoredFrom) {
        const version = data.versions.reduce((max, item) => Math.max(max, item.version), 0) + 1;
        const record = {
            version,
            content,
            createdAt: new Date().toISOString(),
            actor,
            restoredFrom,
        };
        data.versions.push(record);
        return {
            version,
            content,
            createdAt: record.createdAt,
        };
    }
}
export class MemoryAuthStore {
    links = new Map();
    sessions = new Map();
    async saveMagicLink(input) {
        this.links.set(input.tokenHash, { ...input, used: false });
    }
    async deleteMagicLink(tokenHash) {
        this.links.delete(tokenHash);
    }
    async consumeMagicLink(tokenHash, now) {
        const link = this.links.get(tokenHash);
        if (!link || link.used || link.expiresAt.getTime() <= now.getTime())
            return null;
        link.used = true;
        return { siteId: link.siteId, email: link.email };
    }
    async saveSession(input) {
        this.sessions.set(input.tokenHash, input);
    }
    async getSession(tokenHash, now) {
        const session = this.sessions.get(tokenHash);
        if (!session || session.expiresAt.getTime() <= now.getTime())
            return null;
        return { siteId: session.siteId, email: session.email };
    }
    async deleteSession(tokenHash) {
        this.sessions.delete(tokenHash);
    }
}
export class MemoryRateLimitStore {
    buckets = new Map();
    async consume(bucket, nowMs, windowMs, limit) {
        const current = this.buckets.get(bucket) ?? null;
        const result = consumeFixedWindow(current, nowMs, limit, windowMs);
        this.buckets.set(bucket, result.entry);
        return result.decision;
    }
}
