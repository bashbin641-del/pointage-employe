import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const requestedType = url.searchParams.get("type");
  const type = requestedType === "invite" || requestedType === "recovery"
    ? requestedType as EmailOtpType
    : null;

  if (tokenHash && type) {
    const { error } = await (await createClient()).auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) redirect("/definir-mot-de-passe");
  }
  redirect("/connexion?erreur=invitation");
}
