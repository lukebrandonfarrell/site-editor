import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteEditorProvider } from "@thereactnativerewind/site-editor";
import { SiteEditorFrame, getEditorBootstrap } from "@thereactnativerewind/site-editor/server";
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
  title: "Harbor & Co. — Site Editor demo",
  description: "A marketing page whose copy can be edited in place with Site Editor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = getEditorBootstrap();
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <SiteEditorProvider bootstrap={bootstrap}>
          <SiteEditorFrame>{children}</SiteEditorFrame>
        </SiteEditorProvider>
      </body>
    </html>
  );
}
