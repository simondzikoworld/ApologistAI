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
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--page-bg").trim() || "#ffffff",
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
        <div className="max-w-[85%] sm:max-w-[75%] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </motion.div>
    );
  }

  const processedContent = wrapScriptureRefs(message.content, lang);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className="group"
    >
      <div className="w-full min-w-0">
        <div ref={bubbleRef} className="prose prose-slate dark:prose-invert max-w-none p-1">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="font-serif text-2xl font-medium tracking-tight text-[var(--text-primary)] mt-5 mb-2 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="font-serif text-xl font-medium tracking-tight text-[var(--text-primary)] mt-5 mb-2 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mt-4 mb-1.5 first:mt-0">{children}</h3>,
              p: ({ children }) => <p className="text-[15px] text-[var(--text-body)] leading-7 mb-3 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
              em: ({ children }) => <em className="italic text-[var(--text-body)]">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1.5 marker:text-[var(--text-muted)]">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1.5 marker:text-[var(--text-muted)]">{children}</ol>,
              li: ({ children }) => <li className="text-[15px] text-[var(--text-body)] leading-7">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-amber-400 dark:border-[#cbb994]/60 pl-4 font-serif italic text-[var(--text-body)] my-3">{children}</blockquote>
              ),
              code: ({ children }) => {
                const str = String(children);
                const ref = parseBibCode(str);
                if (ref) return <ScripturePill reference={ref} lang={lang} />;
                return <code className="bg-[var(--surface-2)] text-[var(--text-primary)] px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
              },
              hr: () => <hr className="border-[var(--border)] my-5" />,
              table: ({ children }) => (
                <div className="my-3 overflow-x-auto scroll-thin"><table className="my-0">{children}</table></div>
              ),
            }}
          >
            {processedContent}
          </ReactMarkdown>
          {streaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
              className="inline-block w-[2px] h-4 bg-amber-500 dark:bg-[#cbb994] ml-0.5 rounded-full align-middle"
            />
          )}
        </div>

        {!streaming && (
          <div className="mt-2 flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
              title="Copy response"
            >
              {copied ? (
                <><CheckIcon /><span>{t(lang, "copiedBtn")}</span></>
              ) : (
                <><CopyIcon /><span>{t(lang, "copyBtn")}</span></>
              )}
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50"
              title="Save as image"
            >
              <ShareIcon />
              <span>{sharing ? "…" : t(lang, "saveBtn")}</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ShareIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
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
