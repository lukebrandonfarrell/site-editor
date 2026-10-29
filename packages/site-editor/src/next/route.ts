import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { readConfig } from "../config.js";
import { createSiteEditorHandler } from "../http/handler.js";
import { createDefaultServices } from "../server/services.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Handler = (req: Request) => Promise<Response>;

let handler: Handler | undefined;

function getHandler(): Handler {
  if (!handler) {
    const services = createDefaultServices();
    const paths = readConfig().revalidatePaths;
    handler = createSiteEditorHandler({
      ...services,
      revalidate: () => {
        revalidateTag("site-editor", "max");
        for (const path of paths) revalidatePath(path);
      },
    });
  }
  return handler;
}

export function GET(req: Request): Promise<Response> {
  return getHandler()(req);
}

export function POST(req: Request): Promise<Response> {
  return getHandler()(req);
}

export function PUT(req: Request): Promise<Response> {
  return getHandler()(req);
}

export function DELETE(req: Request): Promise<Response> {
  return getHandler()(req);
}
