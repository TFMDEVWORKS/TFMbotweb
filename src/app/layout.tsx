


import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "TFM Mall — Your store, on WhatsApp and the web",
  description: "Browse Ghanaian stores and order straight through WhatsApp.",
};

function ThemeInit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem("tfm-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`,
      }}
    />
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <body>
        <ThemeInit />
        <div className="scroll-progress" aria-hidden="true" />
        <SiteChrome><main>{children}</main></SiteChrome>
      </body>
    </html>
  );
}
