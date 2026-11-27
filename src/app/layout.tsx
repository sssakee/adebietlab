import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const description = "5–11 сынып оқушылары мен қазақ әдебиеті мұғалімдеріне арналған зертхана: өлең өлшегіш, кейіпкер картасы, оқиға желісі және ЖИ көмекшісі.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "ӘдебиетLab", template: "%s · ӘдебиетLab" },
  openGraph: { type: "website", locale: "kk_KZ", siteName: "ӘдебиетLab", title: "ӘдебиетLab — қазақ әдебиеті зертханасы", description, images: ["/mascot/kyrantay.png"] },
  description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef5ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1729" },
  ],
  viewportFit: "cover", // lets the phone bottom bar use env(safe-area-inset-bottom)
};

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
