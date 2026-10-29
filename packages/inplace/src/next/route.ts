import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { readConfig } from "../config.js";
import { createInplaceHandler, editorUnavailableResponse } from "../http/handler.js";
import { createDefaultServices } from "../server/services.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Handler = (req: Request) => Promise<Response>;

let handler: Handler | undefined;

function getHandler(): Handler {
  if (!handler) {
    const services = createDefaultServices();
    const paths = readConfig().revalidatePaths;
    handler = createInplaceHandler({
      ...services,
      revalidate: () => {
        revalidateTag("inplace", "max");
        revalidateTag("site-editor", "max");
        for (const path of paths) revalidatePath(path);
      },
    });
  }
  return handler;
}

async function call(req: Request): Promise<Response> {
  try {
    return await getHandler()(req);
  } catch (error) {
    return editorUnavailableResponse(error);
  }
}

export function GET(req: Request): Promise<Response> {
  return call(req);
}

export function POST(req: Request): Promise<Response> {
  return call(req);
}

export function PUT(req: Request): Promise<Response> {
  return call(req);
}

export function DELETE(req: Request): Promise<Response> {
  return call(req);
}
