"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordConfigured && password !== confirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    setError("");
    let passwordWasSaved = passwordConfigured;
    try {
      if (!passwordConfigured) {
        const { error: updateError } = await (await createClient()).auth.updateUser({ password });
        if (updateError && updateError.code !== "same_password") throw updateError;
        passwordWasSaved = true;
        setPasswordConfigured(true);
        setPassword("");
        setConfirmation("");
      }

      const activationResponse = await fetch("/api/core/moi/activation", { method: "POST" });
      if (!activationResponse.ok) throw new Error("ACTIVATION_CONFIRMATION_FAILED");
      router.replace("/");
      router.refresh();
    } catch {
      setError(passwordWasSaved
        ? "Le mot de passe est enregistré, mais l’activation n’a pas été confirmée. Réessayez."
        : "Le mot de passe n’a pas été enregistré. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      {!passwordConfigured ? (
        <>
          <label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label>Confirmer le mot de passe<input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        </>
      ) : <p className="auth-help">Votre mot de passe est enregistré. Confirmez maintenant l’activation du compte.</p>}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={pending}>{pending ? "Activation…" : passwordConfigured ? "Finaliser l’activation" : "Enregistrer mon mot de passe"}</button>
    </form>
  );
}
