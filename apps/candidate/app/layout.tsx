import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/providers/store-provider";
import { ToastProvider } from "@/providers/toast-provider";

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
      <body>
        <StoreProvider>
          <ToastProvider />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}

