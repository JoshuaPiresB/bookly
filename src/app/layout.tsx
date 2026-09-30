import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });

const themeScript = `(function(){try{var saved=localStorage.getItem("bookly-theme");var preference=saved==="light"||saved==="dark"||saved==="system"?saved:"system";var theme=preference==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):preference;document.documentElement.dataset.theme=theme;document.documentElement.dataset.themePreference=preference;document.documentElement.style.colorScheme=theme;var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",theme==="dark"?"#08111f":"#f8fafc")}catch(error){document.documentElement.dataset.theme="light"}})();`;

export const metadata: Metadata = {
  title: { default: "Bookly", template: "%s · Bookly" },
  description: "Sua biblioteca pessoal online.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning>
    <head><meta name="theme-color" content="#f8fafc" /><script id="bookly-theme" dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body className={`${inter.variable} ${lora.variable} antialiased`}>{children}</body>
  </html>;
}
