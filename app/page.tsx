import { redirect } from "next/navigation";
import { connection } from "next/server";
import EmployeeWorkspace from "@/components/employee-workspace";
import { coreApi } from "@/lib/api/server";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

function AccessMessage({ blocked = false }: { blocked?: boolean }) {
  return <main className="login-page"><section className="login-card"><p className="eyebrow">ACCÈS EMPLOYÉ</p><h1>{blocked ? "Compte bloqué" : "Profil non attribué"}</h1><p>{blocked ? "Votre accès a été bloqué par un administrateur INOX. Aucun QR ni pointage ne peut être utilisé tant que le compte n’est pas réactivé." : "Ce compte est valide, mais aucune fiche employé active ne lui est associée. Contactez un administrateur."}</p><form action="/api/auth/logout" method="post"><button className="secondary-button">Se déconnecter</button></form></section></main>;
}

export default async function Home() {
  await connection();
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) redirect("/connexion");

  const [meResponse, attendanceResponse] = await Promise.all([coreApi("moi"), coreApi("moi/pointages")]);
  if (meResponse.status === 404) return <AccessMessage />;
  if (meResponse.status === 403) {
    const result = await meResponse.json() as { message?: string };
    if (result.message === "COMPTE_EMPLOYE_INACTIF") return <AccessMessage blocked />;
  }
  if (!meResponse.ok) throw new Error("EMPLOYEE_PROFILE_UNAVAILABLE");

  const { employee } = await meResponse.json() as {
    employee: { id: string; displayName: string; matricule: string; site: { name: string; timezone: string } | null };
  };
  const events = attendanceResponse.ok ? (await attendanceResponse.json() as { items: [] }).items : [];
  return <EmployeeWorkspace employee={{ ...employee, email: data.user.email ?? "Adresse indisponible" }} initialEvents={events} />;
}
