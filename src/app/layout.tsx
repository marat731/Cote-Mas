import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Côté Mas — Portrait Retexturing",
  description:
    "Transform your photographs into Provençal-inspired artworks, curated by Côté Mas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
