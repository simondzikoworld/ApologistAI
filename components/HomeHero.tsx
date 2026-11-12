"use client";

import { useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { t, type Lang } from "@/lib/i18n";
import type { Verse } from "@/data/dailyVerses";
import HeroPhone from "./HeroPhone";
import StoreBadges from "./StoreBadges";

interface Props {
  lang: Lang;
  verse: Verse;
  /** Opens the chat with this question (empty: just open it). */
  onAsk: (question: string) => void;
}

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8, transition: { duration: 0.18 } },
  transition: { duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] as const },
});

// The landing page's first screen: a short invitation in warm light, a place to
// ask, and the app itself rising from below and echoing what's typed.
export default function HomeHero({ lang, verse, onAsk }: Props) {
  const [question, setQuestion] = useState("");
  const invite = t(lang, "heroInvite2");

  return (
    <div className="relative flex-1 w-full flex flex-col items-center text-center">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl py-6">
        <motion.span {...rise(0.05)} aria-hidden="true" className="text-[24px] leading-none text-[var(--gold)] icon-glow-gold select-none">
          ✝
        </motion.span>

        <motion.h1
          {...rise(0.15)}
          className="mt-5 font-serif font-medium tracking-[-0.025em] leading-[1.04] text-[var(--text-primary)] text-[clamp(2.5rem,min(6.2vw,8vh),5rem)] text-balance"
        >
          <span className="block">{t(lang, "heroInvite1")}</span>
          {/* Only this line glows, in the warm accent. */}
          <span
            data-text={invite}
            className="glow-text block italic"
            style={{ "--glow-core": "var(--gold-glow-core)", "--glow-bloom": "var(--gold-glow-bloom)" } as CSSProperties}
          >
            {invite}
          </span>
        </motion.h1>

        <motion.form
          {...rise(0.3)}
          onSubmit={(e) => { e.preventDefault(); onAsk(question.trim()); }}
          className="mt-[clamp(1.5rem,4vh,2.5rem)] w-full max-w-md flex items-center gap-2 pl-5 pr-1.5 py-1.5 rounded-full glass shadow-[0_10px_40px_rgb(0_0_0/0.10)] dark:shadow-[0_10px_40px_rgb(0_0_0/0.45)] focus-within:border-[var(--gold)]/60 transition-colors"
        >
          <label htmlFor="hero-ask" className="sr-only">{t(lang, "chatPlaceholderShort")}</label>
          <input
            id="hero-ask"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t(lang, "chatPlaceholderShort")}
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent py-2.5 text-base sm:text-[15px] text-left text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="submit"
            aria-label={t(lang, "tryItNow")}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 dark:bg-[#e3d2ad] dark:hover:bg-[#f5efe3] text-white dark:text-[#1c1813] transition-colors"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
            </svg>
          </button>
        </motion.form>

        <motion.div {...rise(0.45)} className="mt-6">
          <StoreBadges lang={lang} />
        </motion.div>
      </div>

      <HeroPhone lang={lang} verse={verse} draft={question} onAsk={onAsk} />
    </div>
  );
}
