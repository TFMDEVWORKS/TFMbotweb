import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "WhatsAppMall Admin",
  description: "Marketplace administration console.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body><div className="scroll-progress" aria-hidden="true" /><main>{children}</main></body>
    </html>
  );
}
