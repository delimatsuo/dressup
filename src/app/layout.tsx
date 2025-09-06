import type { Metadata, Viewport } from "next";
import { ClientOnly } from "@/components/ClientOnly";
import { SessionProvider } from "@/components/SessionProvider";
import { SessionTimer } from "@/components/SessionTimer";
import "./globals.css";

export const metadata: Metadata = {
  title: "DressUp - Virtual Outfit Try-On",
  description: "Try on outfits virtually with AI-powered fashion technology",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#8B5CF6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientOnly>
          <SessionProvider>
            <SessionTimer />
            {children}
          </SessionProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
