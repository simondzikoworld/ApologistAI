"use client";

import { motion } from "framer-motion";
import { t, tArr, type Lang } from "@/lib/i18n";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

interface ChatPreviewProps {
  onExpand: () => void;
  lang: Lang;
}

export default function ChatPreview({ onExpand, lang }: ChatPreviewProps) {
  const questions = tArr(lang, "starterQuestions");

  return (
    <div
      className="flex flex-col h-full w-full cursor-pointer select-none"
      onClick={onExpand}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-2.5 bg-white dark:bg-slate-900">
        <span className="text-xl text-amber-600 leading-none">✝</span>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Apologist AI</p>
          <p className="text-[10px] text-slate-400 leading-tight">{t(lang, "previewTagline")}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-slate-400">{t(lang, "previewReady")}</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-hidden px-4 py-5 flex flex-col items-center justify-center gap-5">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="text-slate-500 text-xs max-w-[260px] text-center leading-relaxed"
        >
          {t(lang, "previewHint")}
        </motion.p>

        <motion.div
          className="grid grid-cols-2 gap-1.5 w-full max-w-[320px]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {questions.map((q) => (
            <motion.div
              key={q}
              variants={itemVariants}
              className="text-left text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 hover:bg-amber-50 hover:border-amber-200 transition-colors leading-snug"
            >
              {q}
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex items-center gap-1.5 text-[10px] text-amber-500 font-medium"
        >
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            ✦
          </motion.span>
          {t(lang, "previewCta")}
        </motion.div>
      </div>

      {/* Input bar — grayed out / decorative */}
      <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900">
        <div className="flex gap-2 items-center">
          <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-800">
            <span className="text-xs text-slate-400">{t(lang, "previewPlaceholder")}</span>
          </div>
          <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-amber-200 opacity-60">
            <SendIconSmall />
          </div>
        </div>
      </div>
    </div>
  );
}

function SendIconSmall() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
