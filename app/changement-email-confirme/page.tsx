import Link from "next/link";

export default function EmailChangeConfirmedPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">SÉCURITÉ DU COMPTE</p>
        <h1>Confirmation enregistrée</h1>
        <p>Si l’autre adresse n’a pas encore été confirmée, ouvrez également le second message. Une fois les deux confirmations terminées, reconnectez-vous avec la nouvelle adresse.</p>
        <Link className="primary-button" href="/connexion">Revenir à la connexion</Link>
      </section>
    </main>
  );
}
