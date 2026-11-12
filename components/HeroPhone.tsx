"use client";

import { motion } from "framer-motion";
import { t, tArr, type Lang } from "@/lib/i18n";
import type { Verse } from "@/data/dailyVerses";

interface Props {
  lang: Lang;
  verse: Verse;
  /** What the visitor is typing in the hero; shown live in the phone's input. */
  draft: string;
  onAsk: (question: string) => void;
}

// One phone standing in the light, rising from the bottom of the first screen.
// It plays a short conversation, and mirrors whatever is typed on the page, so
// the page and the app read as one thing. Its frame carries layoutId
// "chat-card", so sending a question grows the phone into the full chat.
// The phone is also a quiet way in: hovering lifts it and shows "Try it now",
// and clicking opens the chat (asking whatever has been typed so far).
export default function HeroPhone({ lang, verse, draft, onAsk }: Props) {
  const starters = tArr(lang, "starterQuestions");

  return (
    <div className="relative mx-auto w-[min(78vw,300px)] lg:w-[320px] text-left">
      {/* Verse of the day, floating to the left (wide screens only). */}
      <FloatingCard className="hidden lg:block right-full mr-10 top-[18%] w-[250px] -rotate-2" delay={1.4} drift={0}>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">{t(lang, "verseOfDay")}</p>
        <p className="mt-2.5 font-serif italic text-[15px] leading-relaxed text-[var(--text-body)]">&ldquo;{verse.text}&rdquo;</p>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">{verse.ref}</p>
      </FloatingCard>

      {/* A question to try, floating to the right; clicking asks it. */}
      <FloatingCard className="hidden lg:block left-full ml-10 top-[40%] w-[240px] rotate-2" delay={1.7} drift={1.5}>
        <button type="button" onClick={() => onAsk(starters[1])} className="text-left group">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">{t(lang, "tryAsking")}</p>
          <p className="mt-2.5 text-[14px] leading-snug text-[var(--text-primary)]">{starters[1]}</p>
          <p className="mt-3 text-[12px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
            {t(lang, "askThis")} <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </p>
        </button>
      </FloatingCard>

      {/* The phone, cropped by the bottom of the screen and fading into it. */}
      <div className="-mx-28 -mt-28 px-28 pt-28 h-[calc(clamp(250px,40vh,400px)+7rem)] overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
        <motion.button
          type="button"
          layoutId="chat-card"
          onClick={() => onAsk(draft.trim())}
          aria-label={t(lang, "tryItNow")}
          whileHover={{ y: -10 }}
          whileTap={{ scale: 0.985 }}
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40, transition: { duration: 0.2 } }}
          transition={{ duration: 1.1, delay: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          className="group relative block w-full text-left cursor-pointer aspect-[9/18] rounded-[2.6rem] p-[8px] bg-[#1b1814] shadow-[0_-10px_80px_var(--gold-light),0_30px_80px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(255_255_255/0.09)] hover:shadow-[0_-14px_110px_var(--gold-glow-bloom),0_30px_80px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(242_193_78/0.35)] focus-visible:outline-none focus-visible:shadow-[0_-14px_110px_var(--gold-glow-bloom),0_30px_80px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(242_193_78/0.6)] transition-shadow duration-500 select-none"
        >
          {/* Revealed on hover or keyboard focus only: the screen dims and the label rises. */}
          <span className="pointer-events-none absolute inset-[8px] z-10 rounded-[2.1rem] bg-black/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300" />
          <span className="pointer-events-none absolute z-10 left-1/2 top-[clamp(120px,20vh,200px)] -translate-x-1/2 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-all duration-300 whitespace-nowrap rounded-full bg-[#0d0b09]/85 backdrop-blur-md border border-[#f2c14e]/40 px-4 py-2 text-[13px] font-medium text-[var(--gold)] shadow-[0_0_30px_rgb(242_193_78/0.25)]">
            {t(lang, "tryItNow")}
          </span>
          <div className="h-full w-full rounded-[2.1rem] overflow-hidden bg-[#0d0b09] flex flex-col">
            <div className="relative h-8 shrink-0 flex items-center justify-between px-6 text-[10px] font-medium text-[#f5efe3]/80">
              <span>9:41</span>
              <span className="absolute left-1/2 -translate-x-1/2 top-2 h-5 w-[34%] rounded-full bg-black" />
              <span>●●● ▮</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 pt-3 pb-3 border-b border-white/[0.06]">
              <span className="w-5 h-5 rounded-full bg-[#2b2519] text-[var(--gold)] text-[9px] flex items-center justify-center">✝</span>
              <span className="font-serif text-[13px] font-semibold text-[#f5efe3]">Apologist AI</span>
            </div>

            {/* The visitor's own words, typed live from the page. */}
            <div className="mx-3 mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] pl-3.5 pr-1 py-1">
              <span className={`flex-1 truncate text-[11px] ${draft ? "text-[#f5efe3]" : "text-[#7c7468]"}`}>
                {draft || t(lang, "chatPlaceholderShort")}
                {draft && <span className="ml-px inline-block w-px h-3 align-middle bg-[var(--gold)] animate-pulse" />}
              </span>
              <span className="w-6 h-6 rounded-full bg-[#e3d2ad] text-[#1c1813] text-[10px] flex items-center justify-center">↑</span>
            </div>

            <div className="flex-1 flex flex-col gap-3 px-4 pt-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3, duration: 0.4 }}
                className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-[#1e1a16] border border-white/[0.07] px-3 py-2 text-[11px] leading-snug text-[#f5efe3]"
              >
                {starters[0]}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ delay: 1.8, duration: 1.3, times: [0, 0.1, 0.85, 1] }}
                className="flex gap-1 px-1"
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                    className="w-1 h-1 rounded-full bg-[#cbb994]"
                  />
                ))}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.1, duration: 0.5 }}
                className="-mt-6 text-[11px] leading-[1.6] text-[#d8cfc0]"
              >
                <p>{t(lang, "heroDemoAnswer")}</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#f2c14e]/[0.12] border border-[#f2c14e]/30 px-2 py-0.5 text-[10px] text-[var(--gold)]">
                  ▮ {t(lang, "heroDemoRef")}
                </span>
              </motion.div>
            </div>
          </div>
        </motion.button>
      </div>
    </div>
  );
}

function FloatingCard({ children, className, delay, drift }: { children: React.ReactNode; className: string; delay: number; drift: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className={`absolute z-10 ${className}`}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: drift }}
        className="glass-card p-5 shadow-[0_16px_50px_rgb(0_0_0/0.10)] dark:shadow-[0_16px_50px_rgb(0_0_0/0.5)]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
