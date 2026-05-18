import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assessir Candidate",
  description: "Candidate experience for the Assessir platform."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

