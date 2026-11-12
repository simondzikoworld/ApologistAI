"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { t, type Lang } from "@/lib/i18n";
import type { DailyReadingData } from "@/app/api/daily-reading/route";

const LOCALE: Record<Lang, string> = { EN: "en-GB", PL: "pl", ES: "es", FR: "fr", DE: "de", PT: "pt-BR" };

interface Props {
  lang: Lang;
  /** Starts a chat about one reading. */
  onAsk: (question: string) => void;
}

// Today's Mass readings, shown inside the chat page so the reader never leaves it.
export default function DailyReadings({ lang, onAsk }: Props) {
  const [data, setData] = useState<DailyReadingData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const today = new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/daily-reading?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error || !d.readings) throw new Error(d.error ?? "no readings");
        setData(d);
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [lang]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scroll-thin">
      <div className="mx-auto w-full max-w-2xl px-5 sm:px-6 pt-16 lg:pt-12 pb-16">
        <header className="text-center">
          <span aria-hidden="true" className="text-2xl leading-none text-[var(--gold)] icon-glow-gold">✝</span>
          <h1 className="mt-4 font-serif text-[clamp(2rem,5vw,2.75rem)] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
            {t(lang, "dailyReadingTitle")}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{today}</p>
        </header>

        {status === "loading" && (
          <div className="flex gap-1.5 items-center justify-center py-16">
            {[0, 150, 300].map((d) => (
              <span key={d} className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
            <span className="ml-2 text-sm text-[var(--text-muted)]">{t(lang, "dailyReadingLoading")}</span>
          </div>
        )}

        {status === "error" && (
          <p className="py-16 text-center text-sm italic text-[var(--text-muted)]">{t(lang, "dailyReadingError")}</p>
        )}

        {status === "ready" && data && (
          <div className="mt-10">
            {data.readings.map((r, i) => (
              <motion.section
                key={`${r.title}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.06, 0.3), ease: "easeOut" }}
                className="py-8 border-t border-[var(--border)] first:border-t-0 first:pt-0"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--gold)]">{r.title}</p>
                {(r.reference || r.subtitle) && (
                  <h2 className="mt-1.5 font-serif text-xl font-medium text-[var(--text-primary)]">
                    {r.reference}
                    {r.reference && r.subtitle && <span className="text-[var(--text-muted)]"> · </span>}
                    {r.subtitle && <span className="italic font-normal text-[var(--text-body)]">{r.subtitle}</span>}
                  </h2>
                )}
                <div className="mt-4 space-y-3">
                  {r.text.split("\n\n").map((para, j) => (
                    <p key={j} className="font-serif text-[17px] leading-[1.75] text-[var(--text-body)]">{para}</p>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onAsk(
                      t(lang, "readingAskPrompt")
                        .replace("{title}", r.title)
                        .replace("{ref}", r.reference || r.subtitle),
                    )
                  }
                  className="mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors group"
                >
                  {t(lang, "readingAsk")}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              </motion.section>
            ))}
            <p className="pt-6 border-t border-[var(--border)] text-center">
              <a
                href="https://universalis.com/mass.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-2"
              >
                {t(lang, "dailyReadingSource")}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
