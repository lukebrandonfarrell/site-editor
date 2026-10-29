import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { InplaceProvider } from "@thereactnativerewind/inplace";
import { InplaceFrame, getInplaceBootstrap } from "@thereactnativerewind/inplace/server";
import "./globals.css";

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Harbor & Co. — Inplace demo",
  description: "A marketing page whose copy can be edited in place with Inplace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = getInplaceBootstrap();
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <InplaceProvider bootstrap={bootstrap}>
          <InplaceFrame>{children}</InplaceFrame>
        </InplaceProvider>
      </body>
    </html>
  );
}
