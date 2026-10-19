import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import LoginForm from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";
export const instant = false;
export default async function LoginPage() { await connection(); const { data } = await (await createClient()).auth.getUser(); if (data.user) redirect("/"); return <main className="login-page"><section className="login-card"><Image src="/brand/inox-logo.png" alt="INOX Technologies" width={120} height={85} priority /><p className="eyebrow">ESPACE EMPLOYÉ</p><h1>Accéder à ma carte</h1><p className="intro">Connectez-vous avec les identifiants reçus lors de votre invitation.</p><LoginForm /></section></main>; }
