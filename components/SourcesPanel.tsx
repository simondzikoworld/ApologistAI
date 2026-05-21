"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_SOURCES } from "@/data/defaultSources";

interface Props {
  sources: string[];
  onChange: (sources: string[]) => void;
}

export default function SourcesPanel({ sources, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  function addSource() {
    const url = input.trim();
    if (!url || sources.includes(url)) return;
    try {
      new URL(url);
      onChange([...sources, url]);
      setInput("");
    } catch {
      // not a valid URL — ignore
    }
  }

  function removeSource(url: string) {
    onChange(sources.filter((s) => s !== url));
  }

  function resetToDefaults() {
    onChange([...DEFAULT_SOURCES]);
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.99 }}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        <span className="flex items-center gap-2">
          <BookIcon />
          Sources ({sources.length})
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronIcon />
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 py-3 space-y-3 bg-white dark:bg-slate-900">
              <motion.ul
                className="space-y-1.5"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.04 } },
                }}
              >
                {sources.map((url) => (
                  <motion.li
                    key={url}
                    variants={{
                      hidden: { opacity: 0, x: -6 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    exit={{ opacity: 0, x: -6 }}
                    className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400"
                  >
                    <span className="truncate">{url}</span>
                    <motion.button
                      onClick={() => removeSource(url)}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove source"
                    >
                      ✕
                    </motion.button>
                  </motion.li>
                ))}
                {sources.length === 0 && (
                  <motion.li
                    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                    className="text-xs text-slate-400 italic"
                  >
                    No sources — bot uses built-in knowledge only.
                  </motion.li>
                )}
              </motion.ul>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSource()}
                  placeholder="https://example.com/article"
                  className="flex-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-shadow"
                />
                <motion.button
                  onClick={addSource}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="text-xs px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                >
                  Add
                </motion.button>
              </div>

              <button
                onClick={resetToDefaults}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline"
              >
                Reset to defaults
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BookIcon() {
  return (
    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
