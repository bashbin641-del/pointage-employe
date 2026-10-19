import { redirect } from "next/navigation";
import { connection } from "next/server";
import EmployeeWorkspace from "@/components/employee-workspace";
import { coreApi } from "@/lib/api/server";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export default async function Home() { await connection(); const { data } = await (await createClient()).auth.getUser(); if (!data.user) redirect("/connexion"); const [meResponse, attendanceResponse] = await Promise.all([coreApi("moi"), coreApi("moi/pointages")]); if (meResponse.status === 404) return <main className="login-page"><section className="login-card"><p className="eyebrow">ACCÈS EMPLOYÉ</p><h1>Profil non attribué</h1><p>Ce compte est valide, mais aucune fiche employé active ne lui est associée. Contactez un administrateur.</p><form action="/api/auth/logout" method="post"><button className="secondary-button">Se déconnecter</button></form></section></main>; if (!meResponse.ok) throw new Error("EMPLOYEE_PROFILE_UNAVAILABLE"); const { employee } = await meResponse.json() as { employee: { id: string; displayName: string; matricule: string; site: { name: string; timezone: string } | null } }; const events = attendanceResponse.ok ? (await attendanceResponse.json() as { items: [] }).items : []; return <EmployeeWorkspace employee={employee} initialEvents={events} />; }
