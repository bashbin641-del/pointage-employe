"use client";

import { useEffect, useState, type FormEvent } from "react";
import RecoveryEmailChange from "@/components/recovery-email-change";

export type RecoveryStatus = {
  primaryEmail: string | null;
  recoveryEmail: string | null;
  verified: boolean;
  availableAfter: string | null;
  inCooldown: boolean;
  configuration: { available: boolean; required: boolean };
};

export async function recoveryResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) throw new Error(body.message || "REQUEST_FAILED");
  return body;
}

export default function RecoveryEmailSettings() {
  const [status, setStatus] = useState<RecoveryStatus | null>(null);
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function refresh() {
    const response = await fetch("/api/core/moi/adresse-recuperation", { cache: "no-store" });
    setStatus(await recoveryResponse<RecoveryStatus>(response));
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/core/moi/adresse-recuperation", { cache: "no-store" })
      .then((response) => recoveryResponse<RecoveryStatus>(response))
      .then((result) => { if (active) setStatus(result); })
      .catch(() => { if (active) setError("Impossible de charger l’adresse de récupération."); });
    return () => { active = false; };
  }, []);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const normalized = email.trim().toLowerCase();
    if (normalized !== confirmation.trim().toLowerCase()) {
      setError("Les deux adresses e-mail ne correspondent pas.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/core/moi/adresse-recuperation/demande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const result = await recoveryResponse<{ challengeId: string; destination: string }>(response);
      setChallengeId(result.challengeId);
      setSuccess(`Un code à 8 chiffres a été envoyé à ${result.destination}.`);
    } catch (requestError) {
      const reason = requestError instanceof Error ? requestError.message : "";
      setError(reason === "EMAIL_RECUPERATION_IDENTIQUE" ? "L’adresse de récupération doit être différente de l’adresse de connexion."
        : reason === "EMAIL_RECUPERATION_DEJA_UTILISE" ? "Cette adresse est déjà associée à un autre compte."
          : reason === "TROP_DE_DEMANDES_EMAIL_RECUPERATION" ? "Trop de demandes ont été effectuées. Réessayez dans 15 minutes."
            : "Le code de vérification n’a pas pu être envoyé.");
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/core/moi/adresse-recuperation/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      await recoveryResponse(response);
      setChallengeId("");
      setCode("");
      setEmail("");
      setConfirmation("");
      setSuccess("L’adresse de récupération est vérifiée. Elle sera utilisable après le délai de sécurité de 24 heures.");
      await refresh();
    } catch (verifyError) {
      const reason = verifyError instanceof Error ? verifyError.message : "";
      setError(reason === "CODE_RECUPERATION_EXPIRE" ? "Le code a expiré. Demandez un nouveau code."
        : reason === "CODE_RECUPERATION_BLOQUE" ? "Le code est bloqué après cinq essais. Demandez un nouveau code."
          : "Le code est incorrect ou a déjà été utilisé.");
    } finally {
      setPending(false);
    }
  }

  const availableAt = status?.availableAfter ? new Date(status.availableAfter) : null;

  return (
    <section className="employee-settings" aria-labelledby="recovery-email-title">
      <p className="eyebrow">RÉCUPÉRATION DU COMPTE</p>
      <h1 id="recovery-email-title">Adresse e-mail de récupération</h1>
      <p className="settings-intro">Cette adresse secondaire reçoit les codes de sécurité lorsque l’adresse de connexion est inaccessible.</p>
      {!status ? <p role="status">Chargement de la configuration…</p> : !status.configuration.available ? (
        <p role="status">L’envoi sécurisé est en attente de configuration. Aucune adresse de récupération ne peut encore être enregistrée.</p>
      ) : challengeId ? (
        <form className="password-form" onSubmit={verifyCode}>
          <label>Code reçu sur l’adresse de récupération<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="00000000" /></label>
          <button className="primary-button" disabled={pending}>{pending ? "Vérification…" : "Vérifier l’adresse"}</button>
        </form>
      ) : (
        <>
          {status.verified ? <div className="email-change-status" role="status"><strong>Adresse vérifiée : {status.recoveryEmail}</strong><p>{status.inCooldown && availableAt ? `Délai de sécurité actif jusqu’au ${availableAt.toLocaleString("fr-FR")}.` : "Cette adresse peut recevoir les codes de récupération."}</p></div> : null}
          <RecoveryEmailChange status={status} />
          <form className="password-form" onSubmit={requestCode}>
            <label>{status.verified ? "Nouvelle adresse de récupération" : "Adresse de récupération"}<input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Confirmer l’adresse<input type="email" autoComplete="email" maxLength={254} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
            <button className="primary-button" disabled={pending}>{pending ? "Envoi du code…" : status.verified ? "Vérifier la nouvelle adresse" : "Ajouter et vérifier l’adresse"}</button>
          </form>
        </>
      )}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {success ? <p className="success-message" role="status">{success}</p> : null}
    </section>
  );
}
