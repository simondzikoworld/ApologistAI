"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  reference: string;
}

interface VerseData {
  text: string;
  reference: string;
}

export default function ScripturePill({ reference }: Props) {
  const [open, setOpen] = useState(false);
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (verse !== null || error) return;
    setLoading(true);
    try {
      const encoded = reference.replace(/\s+/g, "+");
      const res = await fetch(`https://bible-api.com/${encoded}?translation=kjv`);
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      setVerse({ text: data.text?.trim() ?? "", reference: data.reference ?? reference });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="relative inline-block align-baseline mx-0.5">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold border border-amber-300 hover:bg-amber-200 transition-colors leading-none"
        title="Click to read verse"
      >
        <BookIcon />
        {reference}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <span
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            {/* Popover */}
            <motion.span
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute left-0 top-full mt-2 z-50 w-72 bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-2xl shadow-xl dark:shadow-slate-900/50 p-4 block"
            >
              <span className="flex items-center gap-1.5 mb-2 block">
                <span className="text-amber-600 text-sm">✝</span>
                <span className="text-xs font-bold text-amber-700">{reference}</span>
                <span className="text-[10px] text-slate-400 ml-1">KJV</span>
              </span>
              {loading && (
                <span className="flex gap-1 items-center block">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                </span>
              )}
              {error && (
                <span className="text-xs text-slate-400 italic block">Could not load verse.</span>
              )}
              {verse && (
                <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic block">
                  &ldquo;{verse.text}&rdquo;
                </span>
              )}
            </motion.span>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

function BookIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
