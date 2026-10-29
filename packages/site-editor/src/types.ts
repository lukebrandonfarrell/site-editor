/**
 * Typed content stored for every editable spot.
 *
 * V1 accepts `text` only. The shape is intentionally a tagged object so later
 * versions can add:
 *
 * - `{ type: "image", src: string, alt: string }`
 * - `{ type: "spacing", padding: BoxEdges, margin: BoxEdges }`
 *
 * without changing the table layout. Unknown types are rejected on write.
 */
export type TextContent = {
  type: "text";
  value: string;
};

export type ContentValue = TextContent;

export type ContentMap = Record<string, TextContent>;

export type VersionSummary = {
  version: number;
  createdAt: string;
  createdBy: string | null;
  restoredFrom: number | null;
};

export type VersionRecord = VersionSummary & {
  content: ContentMap;
};

export type SnapshotFile = {
  format: 1;
  siteId: string;
  version: number;
  publishedAt: string;
  content: ContentMap;
};

export type SiteEditorBootstrap = {
  /** Preview and local dev show the editor without a login. */
  open: boolean;
  apiBase: string;
};

export type PublishResult = {
  version: number;
  content: ContentMap;
  createdAt: string;
};

export type SpotRecord = {
  spotId: string;
  draft: TextContent;
  published: TextContent | null;
};
