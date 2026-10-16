import Image from 'next/image';

export default function Home() {
  return <main className="app-shell"><header className="topbar"><span className="brand"><Image src="/brand/inox-logo.png" alt="INOX Technologies" width={76} height={54} /> <span>INOX PRÉSENCE</span></span><button className="quiet-button">Se connecter</button></header><section className="content"><p className="eyebrow">ESPACE EMPLOYÉ</p><h1>Ma carte professionnelle</h1><p className="intro">Votre carte et vos pointages seront disponibles après connexion.</p><article className="employee-card"><div className="avatar" aria-hidden="true">IP</div><div><p className="card-label">Carte personnelle</p><h2>Connexion requise</h2><p className="muted">Aucune donnée personnelle n’est affichée avant authentification.</p></div></article><div className="actions"><button className="primary-button">Afficher mon QR</button><button className="secondary-button">Mes pointages</button></div></section></main>;
}
