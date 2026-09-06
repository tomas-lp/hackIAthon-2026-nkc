import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/common/AppShell";

const manrope = localFont({
  src: "./fonts/Manrope.ttf",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Inu | Sistema de Alertas e Inundaciones",
  description:
    "Plataforma de reportes ciudadanos e inundaciones para la Provincia de Corrientes.",
};

// Inline script string — must be a raw string, NOT a template literal processed by React,
// so we suppress hydration warnings on <script>. Runs synchronously before first paint
// to apply the correct class and avoid any flash of wrong theme.
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('inu-theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (stored === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${manrope.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--background)] text-[var(--foreground)]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
