"use client";
import "./globals.css";
import ErrorView from "@/components/ErrorView";

/** Stands in for the root layout when even it fails, so Next's English fallback page never shows. */
export default function GlobalError(props: { error: unknown; retry: () => void }) {
  return (
    <html lang="kk">
      <body className="grid min-h-dvh place-items-center p-4">
        <ErrorView {...props} />
      </body>
    </html>
  );
}
