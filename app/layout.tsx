import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inu | Sistema de Alertas e Inundaciones",
  description:
    "Plataforma de reportes ciudadanos e inundaciones para la Provincia de Corrientes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
