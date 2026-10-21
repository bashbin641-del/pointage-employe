"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { useEmployeeRealtime } from "@/lib/use-employee-realtime";

type Employee = { id: string; displayName: string; matricule: string; site: { name: string; timezone: string } | null };
type Event = { id: string; event_type: "entree" | "sortie"; occurred_at: string; sites: { name: string } | null; terminaux: { name: string } | null };
type Qr = { payload: string; expiresAt: string; serverTime: string };

export default function EmployeeWorkspace({ employee, initialEvents }: { employee: Employee; initialEvents: Event[] }) {
  const [section, setSection] = useState<"card" | "history" | "profile">("card");
  const [items, setItems] = useState(initialEvents);
  const [qr, setQr] = useState<Qr | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [pendingAction, setPendingAction] = useState<"qr" | "history" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!qr) return;
    const update = () => setSeconds(Math.max(0, Math.ceil((new Date(qr.expiresAt).getTime() - Date.now()) / 1_000)));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [qr]);

  const refreshHistory = useCallback(async (silent = false) => {
    if (!silent) {
      setPendingAction("history");
      setError("");
    }
    try {
      const response = await fetch("/api/core/moi/pointages", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setItems((await response.json() as { items: Event[] }).items);
    } catch {
      if (!silent) setError("Impossible d’actualiser l’historique.");
    } finally {
      if (!silent) setPendingAction(null);
    }
  }, []);

  useEmployeeRealtime((event) => {
    if (event.type === "employee.updated" || event.type === "employee.deleted") {
      window.location.reload();
      return;
    }
    if (event.type !== "attendance.recorded") return;
    setQr(null);
    setSeconds(0);
    void refreshHistory(true);
  });

  async function generateQr() {
    setPendingAction("qr");
    setError("");
    try {
      const response = await fetch("/api/core/moi/qr", { method: "POST" });
      const result = await response.json() as Qr;
      if (!response.ok || !result.payload) throw new Error();
      setQr(result);
    } catch {
      setError("Impossible de générer un QR. Vérifiez votre connexion et réessayez.");
      setQr(null);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <span className="brand"><Image src="/brand/inox-logo.png" alt="INOX Technologies" width={76} height={54} priority /><span>INOX PRÉSENCE</span></span>
        <form action="/api/auth/logout" method="post"><button className="quiet-button">Se déconnecter</button></form>
      </header>
      <section className="content">
        <p className="eyebrow">ESPACE EMPLOYÉ</p>
        {section === "card" ? <>
          <h1>Ma carte professionnelle</h1>
          <article className="employee-card">
            <div className="avatar" aria-hidden="true">{employee.displayName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
            <div><p className="card-label">Identité professionnelle</p><h2>{employee.displayName}</h2><p className="muted">Matricule : {employee.matricule}<br />Site : {employee.site?.name ?? "Non affecté"}</p></div>
          </article>
          <section className="qr-card" aria-live="polite">
            {qr && seconds > 0 ? <><QRCodeSVG className="attendance-qr" value={qr.payload} size={360} level="M" marginSize={3} aria-label="QR temporaire de pointage" /><strong>Expire dans {seconds} s</strong><p>Présentez ce code bien à plat face à la borne.</p></> : <><div className="qr-placeholder" aria-hidden="true">QR</div><p>{qr ? "Ce QR a expiré. Générez-en un nouveau." : "Aucun QR actif."}</p></>}
            {pendingAction === "qr" ? <span className="compact-data-loader" role="status" aria-live="polite"><span className="compact-data-spinner" aria-hidden="true" />Génération du QR…</span> : null}
            <button className="primary-button" type="button" onClick={() => void generateQr()} disabled={pendingAction !== null || !employee.site}>Générer un nouveau QR</button>
          </section>
        </> : null}
        {section === "history" ? <>
          <div className="section-heading"><div><h1>Historique de présence</h1><p className="intro">Pointages confirmés par l’API centrale.</p></div><button className="secondary-button" type="button" onClick={() => void refreshHistory()} disabled={pendingAction !== null}>Actualiser</button></div>
          {pendingAction === "history" ? <span className="compact-data-loader" role="status" aria-live="polite"><span className="compact-data-spinner" aria-hidden="true" />Actualisation de l’historique…</span> : null}
          {items.length ? <ul className="history-list" tabIndex={0} aria-label="Historique des présences, défilement vertical disponible">{items.map((item) => <li key={item.id}><strong>{item.event_type === "entree" ? "Entrée" : "Sortie"}</strong><span>{new Intl.DateTimeFormat("fr-CI", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Abidjan" }).format(new Date(item.occurred_at))}</span><small>{item.sites?.name} · {item.terminaux?.name}</small></li>)}</ul> : <div className="empty-state"><h2>Aucun pointage</h2><p>Aucun événement confirmé n’est enregistré pour votre compte.</p></div>}
        </> : null}
        {section === "profile" ? <><h1>Mon profil</h1><article className="profile-card"><dl><div><dt>Nom</dt><dd>{employee.displayName}</dd></div><div><dt>Matricule</dt><dd>{employee.matricule}</dd></div><div><dt>Site</dt><dd>{employee.site?.name ?? "Non affecté"}</dd></div></dl></article></> : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </section>
      <nav className="bottom-nav" aria-label="Navigation employé">
        <button type="button" className={section === "card" ? "active" : ""} aria-current={section === "card" ? "page" : undefined} onClick={() => setSection("card")}>Ma carte</button>
        <button type="button" className={section === "history" ? "active" : ""} aria-current={section === "history" ? "page" : undefined} onClick={() => setSection("history")}>Historique</button>
        <button type="button" className={section === "profile" ? "active" : ""} aria-current={section === "profile" ? "page" : undefined} onClick={() => setSection("profile")}>Profil</button>
      </nav>
    </main>
  );
}
