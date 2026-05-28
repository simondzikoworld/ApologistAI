"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, SignUpButton, SignInButton } from "@clerk/nextjs";
import type { Message, ResponseMode } from "@/lib/types";
import { DEFAULT_SOURCES } from "@/data/defaultSources";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import SourcesPanel from "./SourcesPanel";
import { t, tArr, type Lang } from "@/lib/i18n";

const starterContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const starterItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const HISTORY_KEY = "cd-chat-history";
const PRO_MODES: ResponseMode[] = ["detailed"];

interface Props {
  initialQuestion?: string;
  startFresh?: boolean;
  lang?: Lang;
  isPro?: boolean;
}

export default function ChatInterface({ initialQuestion, startFresh, lang = "EN", isPro = false }: Props) {
  const { isSignedIn } = useUser();
  const [messages, setMessages] = useState<Message[]>(() => {
    if (startFresh || typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? (JSON.parse(saved) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [sources, setSources] = useState<string[]>([...DEFAULT_SOURCES]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState<ResponseMode>("simple");
  const [showProPrompt, setShowProPrompt] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledUpRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const speechSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = lang === "PL" ? "pl-PL" : lang === "ES" ? "es-ES" : "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript: string = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distanceFromBottom > 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (!initialQuestion) return;
    const t = setTimeout(() => sendMessage(initialQuestion), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearHistory() {
    setMessages([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  }

  function handlePrint() {
    const el = document.getElementById("print-chat");
    if (!el) return;
    el.innerHTML = `
      <div class="print-header">${t(lang, "printHeader")}</div>
      ${messages.map((m) => `
        <div class="${m.role === "user" ? "print-message-user" : "print-message-assistant"}">
          ${m.role === "user" ? `<strong>${t(lang, "printYou")}:</strong> ` : `<strong>${t(lang, "printBot")}:</strong><br>`}
          ${m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}
        </div>
      `).join("")}
      <div class="print-footer">${t(lang, "printFooter")}</div>
    `;
    window.print();
  }

  function scrollToBottom() {
    userScrolledUpRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function stopStreaming() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setIsStreaming(false);
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: Message = { role: "user", content: text };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setLoading(true);
      scrollToBottom();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, sources, mode, lang }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          if (res.status === 429 || res.status === 403) {
            const data = await res.json().catch(() => ({}));
            if (data?.error === "daily_limit" || data?.error === "pro_required") {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.error },
              ]);
              setLoading(false);
              if (data?.error === "pro_required") setShowProPrompt(true);
              return;
            }
          }
          throw new Error("Request failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        setLoading(false);
        setIsStreaming(true);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: updated[updated.length - 1].content + chunk,
            };
            return updated;
          });
        }

        setIsStreaming(false);
      } catch (err) {
        setLoading(false);
        setIsStreaming(false);
        if ((err as Error).name === "AbortError") {
          // Keep partial response; discard if nothing was received yet
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && !last.content.trim()) return prev.slice(0, -1);
            return prev;
          });
          return;
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t(lang, "errorMsg") },
        ]);
      }
    },
    [messages, sources, mode, lang]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !loading) sendMessage(input.trim());
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth px-4 py-6 space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center h-full gap-6 text-center pb-8"
            >
              <p className="text-slate-500 text-sm max-w-xs">
                {t(lang, "chatHint")}
              </p>
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md"
                variants={starterContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {tArr(lang, "starterQuestions").map((q) => (
                  <motion.button
                    key={q}
                    variants={starterItemVariants}
                    whileHover={{ scale: 1.02, backgroundColor: "#fffbeb" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sendMessage(q)}
                    className="text-left text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 transition-colors"
                  >
                    {q}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {messages.map((msg, i) =>
            msg.role === "assistant" && (msg.content === "daily_limit" || msg.content === "pro_required") ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 border border-amber-200 dark:border-amber-700/50 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 text-base leading-none mt-0.5">✦</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">
                        {msg.content === "pro_required"
                          ? "Detailed mode requires a Pro subscription."
                          : !isSignedIn
                          ? "You've used your 3 free trial messages."
                          : isPro
                          ? "You've reached your Pro daily limit for this mode."
                          : "You've used your 12 free messages for today."}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {msg.content === "pro_required"
                          ? "Upgrade to Pro to unlock in-depth answers with deep source research."
                          : !isSignedIn
                          ? "Create a free account to get 12 messages per day, then upgrade to Pro for more."
                          : "Upgrade to Pro for 30 messages/day, Detailed mode, and deep source research."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isSignedIn ? (
                      <>
                        <SignUpButton mode="modal">
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors">
                            Create free account
                          </button>
                        </SignUpButton>
                        <SignInButton mode="modal">
                          <button className="inline-flex items-center px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            Sign in
                          </button>
                        </SignInButton>
                      </>
                    ) : (
                      <>
                        <a
                          href="#pricing"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
                        >
                          ✦ {isPro ? "View plan" : "Upgrade to Pro"}
                        </a>
                        {msg.content === "daily_limit" && !isPro && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 self-center">or come back tomorrow for free</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <MessageBubble
                key={i}
                message={msg}
                streaming={isStreaming && i === messages.length - 1}
                lang={lang}
              />
            )
          )}
        </AnimatePresence>

        <AnimatePresence>
          {loading && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="flex justify-start"
            >
              <div className="border-l-4 border-amber-500 bg-amber-50 rounded-2xl rounded-tl-sm">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="border-t border-slate-100 dark:border-slate-800 px-4 py-4 space-y-3 bg-white dark:bg-slate-900"
      >
        <SourcesPanel sources={sources} onChange={setSources} />

        {/* Mode toggle — sliding pill via layoutId */}
        <div className="flex items-center justify-between gap-2">
          {messages.length > 0 && (
            <div className="flex items-center gap-1">
              <motion.button
                onClick={clearHistory}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-red-400 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                title="Clear conversation"
              >
                <TrashIcon />
                {t(lang, "clearBtn")}
              </motion.button>
              <motion.button
                onClick={handlePrint}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                title="Print / Save as PDF"
              >
                <PrintIcon />
                {t(lang, "printBtn")}
              </motion.button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 shrink-0">{t(lang, "responseMode")}</span>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-medium">
            {(["simple", "detailed", "challenge"] as ResponseMode[]).map((m, idx) => {
              const requiresPro = PRO_MODES.includes(m);
              const isLocked = requiresPro && !isPro;
              return (
                <button
                  key={m}
                  onClick={() => {
                    if (isLocked) { setShowProPrompt(true); return; }
                    setShowProPrompt(false);
                    setMode(m);
                  }}
                  title={isLocked ? "Pro feature — upgrade to unlock" : undefined}
                  className={`relative px-3 py-1.5 transition-colors ${
                    idx > 0 ? "border-l border-slate-200 dark:border-slate-700" : ""
                  } ${mode === m && !isLocked ? "text-white" : isLocked ? "text-slate-400 dark:text-slate-500 cursor-not-allowed" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  {mode === m && !isLocked && (
                    <motion.div
                      layoutId="mode-pill"
                      className={`absolute inset-0 ${m === "challenge" ? "bg-red-500" : "bg-amber-500"}`}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1">
                    {m === "simple" ? t(lang, "modeSimple") : m === "detailed" ? t(lang, "modeDetailed") : t(lang, "modeChallenge")}
                    {isLocked && <span className="text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 px-1 py-px rounded leading-none">PRO</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            <motion.span
              key={mode}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className={`text-xs ${mode === "challenge" ? "text-red-400 font-medium" : "text-slate-400"}`}
            >
              {mode === "simple"
                ? t(lang, "modeSimpleDesc")
                : mode === "detailed"
                ? t(lang, "modeDetailedDesc")
                : t(lang, "modeChallengeDesc")}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Pro upsell prompt — shown when user clicks Detailed */}
        <AnimatePresence>
          {showProPrompt && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50"
            >
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <span className="font-semibold">Detailed mode is Pro only.</span> Unlock unlimited messages + deep research.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="#pricing"
                  onClick={() => setShowProPrompt(false)}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2"
                >
                  See pricing ↓
                </a>
                <button onClick={() => setShowProPrompt(false)} className="text-slate-400 hover:text-slate-600 text-sm leading-none">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(lang, "chatPlaceholder")}
            rows={2}
            className="flex-1 resize-none border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-shadow"
          />
          {speechSupported && (
            <motion.button
              onClick={toggleListening}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border transition-colors ${
                listening
                  ? "bg-red-100 border-red-300 text-red-500"
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-300"
              }`}
              title={listening ? "Stop listening" : "Speak your question"}
            >
              {listening ? (
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <MicIcon active />
                </motion.span>
              ) : (
                <MicIcon active={false} />
              )}
            </motion.button>
          )}
          <motion.button
            onClick={() => {
              if (loading || isStreaming) { stopStreaming(); }
              else if (input.trim()) { sendMessage(input.trim()); }
            }}
            disabled={!input.trim() && !loading && !isStreaming}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white transition-colors ${
              loading || isStreaming
                ? "bg-red-500 hover:bg-red-600"
                : "bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
            title={loading || isStreaming ? "Stop" : "Send"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {loading || isStreaming ? (
                <motion.span key="stop" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.12 }}>
                  <StopIcon />
                </motion.span>
              ) : (
                <motion.span key="send" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.12 }}>
                  <SendIcon />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* Hidden container used by window.print() — populated by handlePrint() */}
      <div id="print-chat" style={{ display: "none" }} />
    </div>
  );
}

function SendIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
