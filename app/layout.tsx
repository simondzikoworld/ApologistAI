import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Apologist AI — Christian Apologetics",
  description: "An AI-powered Christian apologetics assistant. Defend the faith, answer objections, and explore the truth of Christianity.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Apply saved dark-mode class before first paint to avoid flash */}
          <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem('cd-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})();` }} />
        </head>
        <body className={`${inter.className} bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
