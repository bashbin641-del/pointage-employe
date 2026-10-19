import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import PasswordForm from "@/components/password-form";
import { createClient } from "@/lib/supabase/server";
export const instant = false;
export default async function PasswordPage() { await connection(); const { data } = await (await createClient()).auth.getUser(); if (!data.user) redirect("/connexion"); return <main className="login-page"><section className="login-card"><Image src="/brand/inox-logo.png" alt="INOX Technologies" width={120} height={85} priority /><p className="eyebrow">ACTIVATION DU COMPTE</p><h1>Choisir un mot de passe</h1><p className="intro">Utilisez au moins 12 caractères et ne réutilisez pas un mot de passe personnel.</p><PasswordForm /></section></main>; }
