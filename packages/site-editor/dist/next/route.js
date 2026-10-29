import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { readConfig } from "../config.js";
import { createSiteEditorHandler } from "../http/handler.js";
import { createDefaultServices } from "../server/services.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let handler;
function getHandler() {
    if (!handler) {
        const services = createDefaultServices();
        const paths = readConfig().revalidatePaths;
        handler = createSiteEditorHandler({
            ...services,
            revalidate: () => {
                revalidateTag("site-editor", "max");
                for (const path of paths)
                    revalidatePath(path);
            },
        });
    }
    return handler;
}
export function GET(req) {
    return getHandler()(req);
}
export function POST(req) {
    return getHandler()(req);
}
export function PUT(req) {
    return getHandler()(req);
}
export function DELETE(req) {
    return getHandler()(req);
}
