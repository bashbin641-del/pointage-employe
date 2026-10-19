import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
export function GET() { const config = getSupabaseConfig(); return config ? NextResponse.json(config, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ message: "CONFIGURATION_INDISPONIBLE" }, { status: 503 }); }
