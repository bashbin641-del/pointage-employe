import { NextResponse } from "next/server";
import { coreApi } from "@/lib/api/server";
async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) { const { path } = await context.params; const response = await coreApi(path.join("/"), { method: request.method, body: request.method === "GET" ? undefined : await request.text() }); return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store" } }); }
export const GET = forward; export const POST = forward;
