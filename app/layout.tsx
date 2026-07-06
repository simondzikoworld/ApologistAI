import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://apologistai.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: "Apologist AI — AI-Powered Christian Apologetics",
    template: "%s | Apologist AI",
  },
  description:
    "Defend your Christian faith with AI. Get instant, Scripture-backed answers to tough questions about God, the Bible, Catholicism, Islam, atheism, and more. Powered by advanced AI trained on apologetics.",
  keywords: [
    "Christian apologetics AI",
    "Catholic apologetics",
    "defend Christian faith",
    "AI Christian chatbot",
    "answers to atheism",
    "Christian Q&A",
    "Bible questions answered",
    "is Christianity true",
    "apologetics tool",
    "Catholic answers",
    "Christian vs Islam",
    "does God exist",
    "Christian evidence",
    "faith and reason",
    "apologetyka katolicka",
  ],
  authors: [{ name: "Apologist AI" }],
  creator: "Apologist AI",
  publisher: "Apologist AI",
  category: "Religion & Spirituality",

  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["pl_PL"],
    url: APP_URL,
    siteName: "Apologist AI",
    title: "Apologist AI — Defend Your Faith with AI",
    description:
      "Get instant, well-reasoned answers to the hardest questions about Christianity. Scripture, logic, and Catholic tradition — all in one place.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Apologist AI — AI-Powered Christian Apologetics",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Apologist AI — Defend Your Faith with AI",
    description:
      "Instant AI answers to the toughest questions about Christianity, Catholicism, Islam, and atheism — backed by Scripture and Church tradition.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: APP_URL,
    languages: {
      "en-US": APP_URL,
      "pl-PL": `${APP_URL}?lang=PL`,
    },
  },

  verification: {
    // Add your Google Search Console verification token here when you get it:
    // google: "your-google-verification-token",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Apply saved dark-mode class before first paint to avoid flash */}
          <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem('cd-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})();` }} />
        </head>
        <body className={`${inter.className} antialiased`} style={{ backgroundColor: 'var(--page-bg)', color: 'var(--text-primary)' }}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "WebSite",
                    "@id": `${APP_URL}/#website`,
                    url: APP_URL,
                    name: "Apologist AI",
                    description: "AI-powered Christian and Catholic apologetics assistant",
                    inLanguage: ["en-US", "pl-PL"],
                    potentialAction: {
                      "@type": "SearchAction",
                      target: { "@type": "EntryPoint", urlTemplate: `${APP_URL}/?q={search_term_string}` },
                      "query-input": "required name=search_term_string",
                    },
                  },
                  {
                    "@type": "Organization",
                    "@id": `${APP_URL}/#organization`,
                    name: "Apologist AI",
                    url: APP_URL,
                    logo: {
                      "@type": "ImageObject",
                      url: `${APP_URL}/og-image.png`,
                    },
                    sameAs: [],
                  },
                  {
                    "@type": "WebApplication",
                    "@id": `${APP_URL}/#app`,
                    name: "Apologist AI",
                    url: APP_URL,
                    applicationCategory: "EducationalApplication",
                    operatingSystem: "Web",
                    offers: [
                      {
                        "@type": "Offer",
                        price: "0",
                        priceCurrency: "USD",
                        name: "Free Plan",
                        description: "12 messages per day in Simple mode",
                      },
                      {
                        "@type": "Offer",
                        price: "7",
                        priceCurrency: "USD",
                        name: "Pro Plan",
                        description: "30 Simple + 15 Detailed messages per day, deep source research",
                        billingIncrement: "P1M",
                      },
                    ],
                    description:
                      "Ask any question about Christianity, Catholicism, Islam, atheism or the Bible and get instant, Scripture-backed apologetics answers.",
                    featureList: [
                      "AI-powered Christian apologetics",
                      "Catholic perspective on every answer",
                      "Challenge mode for debate training",
                      "Daily Catholic Mass readings",
                      "English and Polish language support",
                      "Deep source research from top apologetics websites",
                    ],
                  },
                  {
                    "@type": "FAQPage",
                    mainEntity: [
                      {
                        "@type": "Question",
                        name: "What is Apologist AI?",
                        acceptedAnswer: {
                          "@type": "Answer",
                          text: "Apologist AI is an AI-powered Christian apologetics assistant that provides Scripture-backed answers to tough questions about Christianity, Catholicism, Islam, atheism, and more.",
                        },
                      },
                      {
                        "@type": "Question",
                        name: "Is Apologist AI free to use?",
                        acceptedAnswer: {
                          "@type": "Answer",
                          text: "Yes, Apologist AI is free with 12 messages per day. A Pro subscription at £7/month unlocks 30 messages/day and the Detailed research mode.",
                        },
                      },
                      {
                        "@type": "Question",
                        name: "Does Apologist AI include Catholic teaching?",
                        acceptedAnswer: {
                          "@type": "Answer",
                          text: "Yes, every response includes a Catholic Perspective section explaining what the Catholic Church teaches on the topic, citing Scripture, Tradition, and the Catechism.",
                        },
                      },
                    ],
                  },
                ],
              }),
            }}
          />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
