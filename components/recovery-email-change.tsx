"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recoveryResponse, type RecoveryStatus } from "@/components/recovery-email-settings";

type Step = "idle" | "recovery-code" | "new-email" | "new-email-code";

export default function RecoveryEmailChange({ status }: { status: RecoveryStatus }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [challengeId, setChallengeId] = useState("");
  const [recoveryProofToken, setRecoveryProofToken] = useState("");
  const [code, setCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!status.verified || status.inCooldown) return null;

  async function begin() {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/core/moi/adresse-recuperation/changement-email/code-recuperation", { method: "POST" });
      const result = await recoveryResponse<{ challengeId: string; destination: string }>(response);
      setChallengeId(result.challengeId);
      setStep("recovery-code");
      setSuccess(`Un code a été envoyé à ${result.destination}.`);
    } catch {
      setError("Le code n’a pas pu être envoyé à l’adresse de récupération.");
    } finally {
      setPending(false);
    }
  }

  async function verifyRecoveryCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/core/moi/adresse-recuperation/changement-email/code-recuperation/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      const result = await recoveryResponse<{ proofToken: string }>(response);
      setRecoveryProofToken(result.proofToken);
      setCode("");
      setStep("new-email");
      setSuccess("Adresse de récupération confirmée. Saisissez maintenant la nouvelle adresse de connexion.");
    } catch {
      setError("Le code est incorrect, expiré ou déjà utilisé.");
    } finally {
      setPending(false);
    }
  }

  async function requestNewEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalized = newEmail.trim().toLowerCase();
    if (normalized !== confirmation.trim().toLowerCase()) {
      setError("Les deux adresses e-mail ne correspondent pas.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/core/moi/adresse-recuperation/changement-email/nouvelle-adresse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofToken: recoveryProofToken, newEmail: normalized }),
      });
      const result = await recoveryResponse<{ challengeId: string; destination: string }>(response);
      setChallengeId(result.challengeId);
      setCode("");
      setStep("new-email-code");
      setSuccess(`Un second code a été envoyé à ${result.destination}.`);
    } catch (requestError) {
      const reason = requestError instanceof Error ? requestError.message : "";
      setError(reason === "EMAIL_DEJA_UTILISE" ? "Cette adresse est déjà utilisée."
        : reason === "EMAIL_IDENTIQUE_ADRESSE_RECUPERATION" ? "La nouvelle adresse de connexion doit être différente de l’adresse de récupération."
          : "La nouvelle adresse n’a pas pu être vérifiée. Recommencez la procédure si le premier code a expiré.");
    } finally {
      setPending(false);
    }
  }

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const verifyResponse = await fetch("/api/core/moi/adresse-recuperation/changement-email/nouvelle-adresse/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryProofToken, challengeId, code }),
      });
      const finalProof = await recoveryResponse<{ proofToken: string }>(verifyResponse);
      const applyResponse = await fetch("/api/core/moi/adresse-recuperation/changement-email/appliquer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofToken: finalProof.proofToken }),
      });
      await recoveryResponse(applyResponse);
      const supabase = await createClient();
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/connexion?email=modifie");
    } catch {
      setError("Le second code est incorrect ou expiré. Aucune modification n’a été appliquée.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="email-change-status">
      <strong>Adresse de connexion inaccessible ?</strong>
      <p>Utilisez l’adresse de récupération vérifiée, puis confirmez la nouvelle adresse. Les sessions seront fermées après la modification.</p>
      {step === "idle" ? <button className="secondary-button" type="button" disabled={pending} onClick={() => void begin()}>{pending ? "Envoi…" : "Utiliser l’adresse de récupération"}</button> : null}
      {step === "recovery-code" ? <form className="password-form" onSubmit={verifyRecoveryCode}><label>Code reçu sur l’adresse de récupération<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></label><button className="primary-button" disabled={pending}>{pending ? "Vérification…" : "Confirmer l’adresse de récupération"}</button></form> : null}
      {step === "new-email" ? <form className="password-form" onSubmit={requestNewEmailCode}><label>Nouvelle adresse de connexion<input type="email" autoComplete="email" maxLength={254} required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} /></label><label>Confirmer la nouvelle adresse<input type="email" autoComplete="email" maxLength={254} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="primary-button" disabled={pending}>{pending ? "Envoi…" : "Envoyer le code à la nouvelle adresse"}</button></form> : null}
      {step === "new-email-code" ? <form className="password-form" onSubmit={finish}><label>Code reçu sur la nouvelle adresse<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></label><button className="primary-button" disabled={pending}>{pending ? "Modification…" : "Confirmer et modifier l’adresse"}</button></form> : null}
      {step !== "idle" ? <button className="secondary-button" type="button" disabled={pending} onClick={() => { setStep("idle"); setCode(""); setError(""); setSuccess(""); }}>Annuler</button> : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {success ? <p className="success-message" role="status">{success}</p> : null}
    </div>
  );
}
