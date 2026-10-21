"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EmployeePasswordSettings({ email }: { email: string }) {
  const [codeSent, setCodeSent] = useState(false);
  const [nonce, setNonce] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function requestCode() {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const supabase = await createClient();
      const { error: reauthenticationError } = await supabase.auth.reauthenticate();
      if (reauthenticationError) throw reauthenticationError;
      setCodeSent(true);
      setSuccess(`Un code de vérification a été envoyé à ${email}.`);
    } catch {
      setError("Le code de vérification n’a pas pu être envoyé. Vérifiez votre connexion puis réessayez.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!/^\d{6,8}$/.test(nonce)) {
      setError("Saisissez le code numérique reçu par e-mail.");
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
      const { error: passwordError } = await supabase.auth.updateUser({ email, password, nonce });
      if (passwordError) throw passwordError;
      setNonce("");
      setPassword("");
      setConfirmation("");
      setCodeSent(false);
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
      <p className="settings-intro">Adresse de connexion : <strong>{email}</strong>. L’ancien mot de passe n’est pas demandé. Un code envoyé à cette adresse confirme votre identité.</p>
      {!codeSent ? (
        <button className="primary-button" type="button" onClick={() => void requestCode()} disabled={pending}>{pending ? "Envoi du code…" : "Envoyer le code de vérification"}</button>
      ) : (
        <form className="password-form" onSubmit={submit}>
          <label>Code reçu par e-mail<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" minLength={6} maxLength={8} required value={nonce} onChange={(event) => setNonce(event.target.value.replace(/\D/g, ""))} /></label>
          <label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label>Confirmer le mot de passe<input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          <div className="settings-actions">
            <button className="primary-button" type="submit" disabled={pending}>{pending ? "Vérification et enregistrement…" : "Modifier le mot de passe"}</button>
            <button className="secondary-button" type="button" disabled={pending} onClick={() => void requestCode()}>Renvoyer un code</button>
          </div>
        </form>
      )}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {success ? <p className="success-message" role="status">{success}</p> : null}
    </section>
  );
}
