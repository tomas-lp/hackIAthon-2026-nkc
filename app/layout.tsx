import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({
  src: "./fonts/Manrope.ttf",
  variable: "--font-manrope",
});

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
    <html lang="es" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
