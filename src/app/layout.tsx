import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#09090f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Dark is the default and only theme for now (see globals.css).
    <html
      lang="en"
      className={cn(
        "dark h-full antialiased",
        GeistSans.variable,
        GeistMono.variable,
      )}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
