import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Espace employé | INOX PRÉSENCE",
  description: "Carte professionnelle et pointages personnels",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
