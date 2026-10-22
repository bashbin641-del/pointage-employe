"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type EmailRequest = {
  id: string;
  newEmail: string;
  status: "pending_target" | "awaiting_confirmations";
  expiresAt: string;
  assisted: boolean;
  canCancel: boolean;
};

type EmailChangeState = {
  currentEmail: string;
  authPendingEmail: string | null;
  request: EmailRequest | null;
};

export default function EmployeeEmailSettings({ email }: { email: string }) {
  const [state, setState] = useState<EmailChangeState>({ currentEmail: email, authPendingEmail: null, request: null });
  const [newEmail, setNewEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [nonce, setNonce] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/core/moi/changement-email", { cache: "no-store" });
    if (!response.ok) throw new Error("EMAIL_CHANGE_UNAVAILABLE");
    setState(await response.json() as EmailChangeState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/core/moi/changement-email", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<EmailChangeState>;
      })
      .then((result) => { if (!cancelled) setState(result); })
      .catch(() => { if (!cancelled) setError("Impossible de charger l’état du changement d’adresse."); });
    return () => { cancelled = true; };
  }, []);

  async function requestCodeFor(request: EmailRequest) {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const supabase = await createClient();
      const { error: reauthenticationError } = await supabase.auth.reauthenticate();
      if (reauthenticationError) throw reauthenticationError;
      setCodeSent(true);
      setSuccess(`Un code de vérification a été envoyé à ${state.currentEmail}.`);
      setState((current) => ({ ...current, request }));
    } catch {
      setError("Le code de vérification n’a pas pu être envoyé. Vérifiez votre connexion puis réessayez.");
    } finally {
      setPending(false);
    }
  }

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const normalizedEmail = newEmail.trim().toLowerCase();
    if (normalizedEmail !== confirmation.trim().toLowerCase()) {
      setError("Les deux adresses e-mail ne correspondent pas.");
      return;
    }
    if (normalizedEmail === state.currentEmail.toLowerCase()) {
      setError("La nouvelle adresse doit être différente de l’adresse actuelle.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/core/moi/changement-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: normalizedEmail }),
      });
      const result = await response.json() as { request?: EmailRequest; message?: string };
      if (!response.ok || !result.request) throw new Error(result.message);
      setState((current) => ({ ...current, request: result.request! }));
      setPending(false);
      await requestCodeFor(result.request);
    } catch (requestError) {
      const code = requestError instanceof Error ? requestError.message : "";
      setError(code === "EMAIL_DEJA_UTILISE" || code === "EMAIL_DEJA_EN_ATTENTE"
        ? "Cette adresse est déjà utilisée ou réservée par une autre demande."
        : code === "TROP_DE_DEMANDES_EMAIL"
          ? "Trop de demandes ont été effectuées. Réessayez dans 15 minutes."
          : "La demande de modification n’a pas pu être créée.");
      setPending(false);
    }
  }

  async function startConfirmations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.request) return;
    if (!/^\d{8}$/.test(nonce)) {
      setError("Saisissez le code à 8 chiffres reçu par e-mail.");
      return;
    }
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const supabase = await createClient();
      const { error: updateError } = await supabase.auth.updateUser(
        { email: state.request.newEmail, nonce },
        { emailRedirectTo: `${window.location.origin}/changement-email-confirme` },
      );
      if (updateError) throw updateError;
      const response = await fetch(`/api/core/moi/changement-email/${state.request.id}/initie`, { method: "POST" });
      if (!response.ok) throw new Error("TRACKING_FAILED");
      setNonce("");
      setCodeSent(false);
      setSuccess("Les confirmations ont été envoyées à votre adresse actuelle et à la nouvelle adresse.");
      await refresh();
    } catch {
      setError("Le code est incorrect ou expiré, ou les confirmations n’ont pas pu être envoyées. Demandez un nouveau code puis réessayez.");
    } finally {
      setPending(false);
    }
  }

  async function cancelRequest() {
    if (!state.request?.canCancel) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/core/moi/changement-email/${state.request.id}/annulation`, { method: "POST" });
      if (!response.ok) throw new Error();
      setCodeSent(false);
      setNonce("");
      setNewEmail("");
      setConfirmation("");
      setSuccess("La demande de modification a été annulée.");
      await refresh();
    } catch {
      setError("Cette demande ne peut plus être annulée.");
    } finally {
      setPending(false);
    }
  }

  async function resendConfirmations() {
    if (!state.request) return;
    setPending(true);
    setError("");
    try {
      const supabase = await createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "email_change",
        email: state.currentEmail,
        options: { emailRedirectTo: `${window.location.origin}/changement-email-confirme` },
      });
      if (resendError) throw resendError;
      const trackingResponse = await fetch(`/api/core/moi/changement-email/${state.request.id}/renvoye`, { method: "POST" });
      if (!trackingResponse.ok) throw new Error("TRACKING_FAILED");
      setSuccess("Les confirmations ont été renvoyées. Vérifiez les deux boîtes de réception.");
      await refresh();
    } catch {
      setError("Les confirmations n’ont pas pu être renvoyées. Attendez quelques instants puis réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="employee-settings" aria-labelledby="employee-email-title">
      <p className="eyebrow">IDENTIFIANT DE CONNEXION</p>
      <h1 id="employee-email-title">Modifier mon adresse e-mail</h1>
      <p className="settings-intro">Adresse actuelle : <strong>{state.currentEmail}</strong>. La modification exige un code envoyé à cette adresse, puis la confirmation de l’ancienne et de la nouvelle adresse.</p>

      {state.request?.status === "awaiting_confirmations" ? (
        <div className="email-change-status" role="status">
          <strong>Confirmations en attente</strong>
          <p>Nouvelle adresse : {state.request.newEmail}. Ouvrez les deux messages de confirmation avant l’expiration de la demande.</p>
          <button className="secondary-button" type="button" disabled={pending} onClick={() => void resendConfirmations()}>{pending ? "Envoi…" : "Renvoyer les confirmations"}</button>
        </div>
      ) : codeSent && state.request ? (
        <form className="password-form" onSubmit={startConfirmations}>
          <p>{state.request.assisted ? "Un administrateur a proposé" : "Vous avez demandé"} la nouvelle adresse <strong>{state.request.newEmail}</strong>.</p>
          <label>Code à 8 chiffres reçu sur l’adresse actuelle<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" minLength={8} maxLength={8} required value={nonce} onChange={(event) => setNonce(event.target.value.replace(/\D/g, ""))} /></label>
          <div className="settings-actions">
            <button className="primary-button" disabled={pending}>{pending ? "Vérification…" : "Vérifier et envoyer les confirmations"}</button>
            <button className="secondary-button" type="button" disabled={pending} onClick={() => void requestCodeFor(state.request!)}>Renvoyer le code</button>
            <button className="secondary-button" type="button" disabled={pending} onClick={() => void cancelRequest()}>Annuler la demande</button>
          </div>
        </form>
      ) : state.request ? (
        <div className="email-change-status">
          <strong>{state.request.assisted ? "Modification proposée par l’administration" : "Demande prête à être confirmée"}</strong>
          <p>Nouvelle adresse : {state.request.newEmail}. Aucun changement ne sera appliqué sans votre validation.</p>
          <div className="settings-actions">
            <button className="primary-button" type="button" disabled={pending} onClick={() => void requestCodeFor(state.request!)}>{pending ? "Envoi…" : "Envoyer mon code de vérification"}</button>
            <button className="secondary-button" type="button" disabled={pending} onClick={() => void cancelRequest()}>Refuser la demande</button>
          </div>
        </div>
      ) : (
        <form className="password-form" onSubmit={createRequest}>
          <label>Nouvelle adresse e-mail<input type="email" autoComplete="email" maxLength={254} required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} /></label>
          <label>Confirmer la nouvelle adresse<input type="email" autoComplete="email" maxLength={254} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          <button className="primary-button" disabled={pending}>{pending ? "Vérification…" : "Envoyer le code de vérification"}</button>
        </form>
      )}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {success ? <p className="success-message" role="status">{success}</p> : null}
    </section>
  );
}
