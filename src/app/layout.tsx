import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ӘдебиетLab", template: "%s · ӘдебиетLab" },
  description: "Әдебиетті зертте. Мағынаны аш. Ойыңды дамыт.",
};

export const viewport: Viewport = { themeColor: "#1a4f9e" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="kk">
      <head>
        <link rel="preload" href="/fonts/JUZ40-Bold.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/JUZ40-Medium.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
