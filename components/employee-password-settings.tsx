"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { recoveryResponse, type RecoveryStatus } from "@/components/recovery-email-settings";
import { useRouter } from "next/navigation";

type VerificationChannel = "primary" | "recovery";

export default function EmployeePasswordSettings({ email }: { email: string }) {
  const router = useRouter();
  const [codeSent, setCodeSent] = useState(false);
  const [channel, setChannel] = useState<VerificationChannel>("primary");
  const [challengeId, setChallengeId] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus | null>(null);
  const [nonce, setNonce] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/core/moi/adresse-recuperation", { cache: "no-store" })
      .then((response) => recoveryResponse<RecoveryStatus>(response))
      .then((result) => { if (active) setRecoveryStatus(result); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function requestCode(requestedChannel: VerificationChannel = channel) {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      setChannel(requestedChannel);
      if (requestedChannel === "recovery") {
        const response = await fetch("/api/core/moi/adresse-recuperation/code-mot-de-passe", { method: "POST" });
        const result = await recoveryResponse<{ challengeId: string; destination: string }>(response);
        setChallengeId(result.challengeId);
        setSuccess(`Un code de vérification a été envoyé à ${result.destination}.`);
      } else {
        const supabase = await createClient();
        const { error: reauthenticationError } = await supabase.auth.reauthenticate();
        if (reauthenticationError) throw reauthenticationError;
        setSuccess(`Un code de vérification a été envoyé à ${email}.`);
      }
      setCodeSent(true);
    } catch (requestError) {
      const reason = requestError instanceof Error ? requestError.message : "";
      setError(reason === "ADRESSE_RECUPERATION_EN_ATTENTE"
        ? "Le délai de sécurité de 24 heures de l’adresse de récupération n’est pas terminé."
        : reason === "ADRESSE_RECUPERATION_REQUISE"
          ? "Ajoutez et vérifiez d’abord une adresse de récupération."
          : "Le code de vérification n’a pas pu être envoyé. Vérifiez votre connexion puis réessayez.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!/^\d{8}$/.test(nonce)) {
      setError("Saisissez le code à 8 chiffres reçu par e-mail.");
      return;
    }
    if (password.length < 12) {
      setError("Le nouveau mot de passe doit contenir au moins 12 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setPending(true);
    try {
      const supabase = await createClient();
      if (channel === "recovery") {
        const verifyResponse = await fetch("/api/core/moi/adresse-recuperation/code-mot-de-passe/verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId, code: nonce }),
        });
        const proof = await recoveryResponse<{ proofToken: string }>(verifyResponse);
        const updateResponse = await fetch("/api/core/moi/adresse-recuperation/mot-de-passe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proofToken: proof.proofToken, newPassword: password }),
        });
        await recoveryResponse(updateResponse);
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/connexion?mot-de-passe=modifie");
        return;
      }
      const { error: passwordError } = await supabase.auth.updateUser({ password, nonce });
      if (passwordError) throw passwordError;
      setNonce("");
      setPassword("");
      setConfirmation("");
      setCodeSent(false);
      setChallengeId("");
      setSuccess("Votre mot de passe a été modifié. Utilisez-le lors de votre prochaine connexion.");
    } catch {
      setError("Le code est incorrect ou expiré, ou le mot de passe ne respecte pas les exigences. Demandez un nouveau code puis réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="employee-settings" aria-labelledby="employee-password-title">
      <p className="eyebrow">SÉCURITÉ DU COMPTE</p>
      <h1 id="employee-password-title">Réinitialiser mon mot de passe</h1>
      <p className="settings-intro">Adresse de connexion : <strong>{email}</strong>. L’ancien mot de passe n’est pas demandé. Choisissez l’adresse qui recevra le code de confirmation.</p>
      {!codeSent ? (
        <div className="settings-actions">
          <button className="primary-button" type="button" onClick={() => void requestCode("primary")} disabled={pending}>{pending ? "Envoi du code…" : "Envoyer sur l’adresse de connexion"}</button>
          {recoveryStatus?.verified ? <button className="secondary-button" type="button" onClick={() => void requestCode("recovery")} disabled={pending}>{pending ? "Envoi du code…" : `Utiliser ${recoveryStatus.recoveryEmail}`}</button> : null}
        </div>
      ) : (
        <form className="password-form" onSubmit={submit}>
          <label>Code à 8 chiffres reçu sur {channel === "recovery" ? "l’adresse de récupération" : "l’adresse de connexion"}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" minLength={8} maxLength={8} required value={nonce} onChange={(event) => setNonce(event.target.value.replace(/\D/g, ""))} /></label>
          <label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label>Confirmer le mot de passe<input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          <div className="settings-actions">
            <button className="primary-button" type="submit" disabled={pending}>{pending ? "Vérification et enregistrement…" : "Modifier le mot de passe"}</button>
            <button className="secondary-button" type="button" disabled={pending} onClick={() => void requestCode(channel)}>Renvoyer un code</button>
          </div>
        </form>
      )}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {success ? <p className="success-message" role="status">{success}</p> : null}
    </section>
  );
}
