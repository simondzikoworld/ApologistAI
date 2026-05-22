"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/lib/types";
import { wrapScriptureRefs, parseBibCode } from "@/lib/scriptureUtils";
import ScripturePill from "./ScripturePill";
import { t, type Lang } from "@/lib/i18n";

interface Props {
  message: Message;
  streaming?: boolean;
  lang?: Lang;
}

export default function MessageBubble({ message, streaming = false, lang = "EN" }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  function handleCopy() {
    // Strip markdown for plain-text clipboard
    const plain = message.content
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`BIB:[^`]+`/g, (m) => m.slice(5, -1))
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^[-*]\s+/gm, "• ")
      .replace(/^\d+\.\s+/gm, "")
      .trim();
    navigator.clipboard.writeText(plain).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleShare() {
    if (!bubbleRef.current || sharing) return;
    setSharing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(bubbleRef.current, {
        backgroundColor: "#fffbeb",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = "christian-debater-answer.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setSharing(false);
    }
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] bg-navy dark:bg-slate-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
          {message.content}
        </div>
      </motion.div>
    );
  }

  const processedContent = wrapScriptureRefs(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex justify-start group"
    >
      <div ref={bubbleRef} className="relative max-w-[85%] border-l-4 border-amber-500 bg-amber-50 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm dark:shadow-none dark:border dark:border-l-4 dark:border-slate-700 dark:border-l-amber-500">

        {/* Action buttons — appear on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <motion.button
            onClick={handleShare}
            disabled={sharing}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:border-amber-300 shadow-sm disabled:opacity-50"
            title="Save as image"
          >
            <ShareIcon />
            <span>{sharing ? "…" : t(lang, "saveBtn")}</span>
          </motion.button>
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:border-amber-300 shadow-sm"
            title="Copy response"
          >
            {copied ? (
              <><CheckIcon /><span>{t(lang, "copiedBtn")}</span></>
            ) : (
              <><CopyIcon /><span>{t(lang, "copyBtn")}</span></>
            )}
          </motion.button>
        </div>

        <div className="prose prose-sm prose-slate max-w-none pr-24">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-base font-bold text-slate-900 mt-3 mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 mt-3 mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-800 mt-2 mb-1">{children}</h3>,
              p: ({ children }) => <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
              em: ({ children }) => <em className="italic text-slate-700 dark:text-slate-300">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-amber-400 pl-3 italic text-slate-600 my-2">{children}</blockquote>
              ),
              code: ({ children }) => {
                const str = String(children);
                const ref = parseBibCode(str);
                if (ref) return <ScripturePill reference={ref} />;
                return <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
              },
              hr: () => <hr className="border-amber-200 my-3" />,
            }}
          >
            {processedContent}
          </ReactMarkdown>
          {streaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
              className="inline-block w-[2px] h-3.5 bg-amber-500 ml-0.5 rounded-full align-middle"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ShareIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
