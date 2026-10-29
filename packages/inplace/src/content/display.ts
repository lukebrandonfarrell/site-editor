export type ContentSource = "database" | "snapshot" | "seed";

/**
 * Choose the string a spot should render.
 *
 * The database wins when it is reachable. A snapshot wins when the database
 * is down but a publish has been saved. The code seed is only for a site that
 * has neither: no `DATABASE_URL`, or the database is unreachable and no
 * snapshot exists yet.
 */
export function displayedText(input: {
  seed: string;
  source: ContentSource;
  published: string | undefined;
}): string {
  const seed = input.seed.trim();
  if (input.source === "seed") return seed;
  if (input.source === "snapshot") return input.published ?? "";
  if (input.published !== undefined) return input.published;
  return seed;
}
