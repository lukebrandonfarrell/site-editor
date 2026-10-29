import "server-only";
export declare const runtime = "nodejs";
export declare const dynamic = "force-dynamic";
export declare function GET(req: Request): Promise<Response>;
export declare function POST(req: Request): Promise<Response>;
export declare function PUT(req: Request): Promise<Response>;
export declare function DELETE(req: Request): Promise<Response>;
