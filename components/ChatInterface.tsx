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
import { DAILY_VERSES_BY_LANG } from "@/data/dailyVerses";

const HISTORY_KEY = "cd-chat-history";
const PROMPT_INDEX_KEY = "cd-help-prompt";
const SUPPORT_COUNT_KEY = "cd-support-count";
const SUPPORT_EVERY = 2;

type LockReason = "pro" | "signup" | "used";
type TrialStatus = { available: boolean; retryAt: number | null };

// Assistant messages that stand for a notice card rather than an answer.
const NOTICES = new Set(["daily_limit", "pro_required", "trial_used", "trial_signup"]);

/** "in 2 days" / "tomorrow" / "in 5 hours", in the chat's language. */
function formatRetry(retryAt: number | null, lang: Lang): string {
  const locale = { EN: "en", PL: "pl", ES: "es", FR: "fr", DE: "de", PT: "pt" }[lang];
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const hours = Math.max(1, Math.ceil(((retryAt ?? Date.now()) - Date.now()) / 3_600_000));
  return hours < 24 ? rtf.format(hours, "hour") : rtf.format(Math.ceil(hours / 24), "day");
}
const PRO_MODES: ResponseMode[] = ["detailed"];

function deriveTitle(text: string): string {
  return text.trim().replace(/[?!.]+$/, "").slice(0, 60) || "New conversation";
}

interface Props {
  initialQuestion?: string;
  startFresh?: boolean;
  lang?: Lang;
  isPro?: boolean;
  conversationId?: string;
  onConversationSaved?: (id: string) => void;
}

export default function ChatInterface({
  initialQuestion,
  startFresh,
  lang = "EN",
  isPro = false,
  conversationId: initialConvId,
  onConversationSaved,
}: Props) {
  const { isSignedIn, user } = useUser();
  const firstName = user?.firstName ?? null;
  const conversationIdRef = useRef<string | null>(initialConvId ?? null);
  const createdAtRef = useRef<number>(Date.now());

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
  // Why Detailed is locked, which decides what the prompt offers.
  const [lockReason, setLockReason] = useState<LockReason>("pro");
  const [listening, setListening] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  // Free accounts get one Detailed answer every few days. null until known,
  // and for Pro or signed-out users, where it doesn't apply.
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const refreshTrial = useCallback(() => {
    fetch("/api/trial")
      .then((r) => r.json())
      .then((d) => setTrial({ available: !!d.available, retryAt: d.retryAt ?? null }))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (isSignedIn && !isPro) refreshTrial();
    else setTrial(null);
  }, [isSignedIn, isPro, refreshTrial]);
  const trialAvailable = !isPro && !!trial?.available;

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledUpRef = useRef(false);
  // Marks the next scroll event as ours, so auto-follow isn't mistaken for the reader.
  const programmaticScrollRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Checked after mount: the server can't know, and guessing differently from
  // the browser made React throw away and rebuild the whole chat on load.
  const [speechSupported, setSpeechSupported] = useState(false);
  // Phones get a shorter placeholder; the full one wraps and makes the box tall.
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setSpeechSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);

  function toggleListening() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = lang === "PL" ? "pl-PL" : lang === "ES" ? "es-ES" : lang === "FR" ? "fr-FR" : lang === "DE" ? "de-DE" : "en-US";
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

    const atBottom = () => el.scrollHeight - el.scrollTop - el.clientHeight <= 80;

    // Auto-follow fires `scroll` as well, so the old check — "is the container
    // far from the bottom?" — tracked our own animation rather than the reader,
    // and kept dragging them back down mid-answer. Distinguishing the two is
    // what makes scrolling up during a reply possible.
    let lastTop = el.scrollTop;

    const onScroll = () => {
      // Ignore the scroll our own auto-follow just caused.
      if (programmaticScrollRef.current) {
        programmaticScrollRef.current = false;
        lastTop = el.scrollTop;
        return;
      }
      // Any upward movement is the reader taking over. Reading direction rather
      // than listening for wheel/touch also covers dragging the scrollbar and
      // paging with the keyboard.
      if (el.scrollTop < lastTop - 2) userScrolledUpRef.current = true;
      // Returning to the bottom re-arms it — the usual chat convention.
      if (atBottom()) userScrolledUpRef.current = false;
      lastTop = el.scrollTop;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (userScrolledUpRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    // Assigning scrollTop is instant. A smooth scroll per streamed chunk left a
    // long-running animation permanently in flight for the reader to fight.
    const target = el.scrollHeight - el.clientHeight;
    // Only claim the next scroll event if this actually moves the view —
    // otherwise no event fires, the flag goes stale, and it swallows the
    // reader's next real scroll.
    if (Math.abs(el.scrollTop - target) > 1) {
      programmaticScrollRef.current = true;
      el.scrollTop = target;
    }
  }, [messages, loading]);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    if (!initialQuestion) return;
    const timer = setTimeout(() => sendMessage(initialQuestion), 350);
    return () => clearTimeout(timer);
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
      setShowSupport(false);
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
              // A refused Detailed request is one of three cases, each with its own card.
              let notice: string = data.error;
              if (data.error === "pro_required") {
                const reason: LockReason = data.signupForTrial ? "signup" : data.retryAt ? "used" : "pro";
                if (reason === "used") setTrial({ available: false, retryAt: data.retryAt });
                notice = reason === "signup" ? "trial_signup" : reason === "used" ? "trial_used" : "pro_required";
                setLockReason(reason);
                setShowProPrompt(true);
                setMode("simple");
              }
              setMessages((prev) => [...prev, { role: "assistant", content: notice }]);
              setLoading(false);
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

        // That was the free Detailed answer: lock it again and step back to Simple.
        if (mode === "detailed" && !isPro) {
          refreshTrial();
          setMode("simple");
        }

        // Every SUPPORT_EVERY answers, gently suggest Pro to non-Pro users.
        if (!isPro) {
          try {
            const count = (parseInt(localStorage.getItem(SUPPORT_COUNT_KEY) ?? "0", 10) || 0) + 1;
            localStorage.setItem(SUPPORT_COUNT_KEY, String(count));
            if (count % SUPPORT_EVERY === 0) setShowSupport(true);
          } catch {}
        }

        if (isSignedIn) {
          setMessages((prev) => {
            const id = conversationIdRef.current ?? crypto.randomUUID();
            conversationIdRef.current = id;
            const firstUserMsg = prev.find((m) => m.role === "user")?.content ?? "";
            fetch("/api/conversations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id,
                title: deriveTitle(firstUserMsg),
                messages: prev.slice(-40),
                mode,
                lang,
                createdAt: createdAtRef.current,
              }),
            }).then(() => onConversationSaved?.(id)).catch(() => {});
            return prev;
          });
        }
      } catch (err) {
        setLoading(false);
        setIsStreaming(false);
        if ((err as Error).name === "AbortError") {
          // A stopped trial answer may still have been counted server-side.
          if (mode === "detailed" && !isPro) refreshTrial();
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && !last.content.trim()) return prev.slice(0, -1);
            return prev;
          });
          return;
        }
        setMessages((prev) => [...prev, { role: "assistant", content: t(lang, "errorMsg") }]);
      }
    },
    [messages, sources, mode, lang, isPro, isSignedIn, refreshTrial]
  );

  // Grow the composer with its content, up to a cap where it starts scrolling.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input, messages.length, isPhone]);

  // Greeting and daily cards depend on the reader's clock, so they're only
  // worked out after mount — the server's time zone would give the wrong answer.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  // The subtitle under the greeting steps to the next variant each time the
  // chat opens. The ref keeps StrictMode's double effect from skipping one.
  const [promptIndex, setPromptIndex] = useState(0);
  const promptPickedRef = useRef(false);
  useEffect(() => {
    if (promptPickedRef.current) return;
    promptPickedRef.current = true;
    let next = 0;
    try {
      next = parseInt(localStorage.getItem(PROMPT_INDEX_KEY) ?? "-1", 10) + 1 || 0;
      localStorage.setItem(PROMPT_INDEX_KEY, String(next));
    } catch {}
    setPromptIndex(next);
  }, []);
  const helpPrompts = tArr(lang, "chatHelpPrompts");
  const helpPrompt = helpPrompts[promptIndex % helpPrompts.length];

  const greeting = !now
    ? " "
    : `${t(lang, now.getHours() < 12 ? "greetingMorning" : now.getHours() < 18 ? "greetingAfternoon" : "greetingEvening")}${firstName ? `, ${firstName}` : ""}`;

  const dayOfYear = now ? Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000) : 0;
  const verses = DAILY_VERSES_BY_LANG[lang] ?? DAILY_VERSES_BY_LANG.EN;
  const verse = verses[dayOfYear % verses.length];
  const starters = tArr(lang, "starterQuestions");
  const suggestion = starters[dayOfYear % starters.length];
  const suggestion2 = starters[(dayOfYear + 1) % starters.length];
  const [cardIndex, setCardIndex] = useState(0);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !loading) sendMessage(input.trim());
    }
  }

  const hasMessages = messages.length > 0;
  const busy = loading || isStreaming;

  /* ─────────────────────────────────────────────────
     Mode selector — glass segmented pills
  ───────────────────────────────────────────────── */
  function ModeBar({ layoutPrefix }: { layoutPrefix: string }) {
    return (
      <div className="inline-flex items-center gap-0.5 p-1 rounded-full border border-[var(--border)] text-xs">
        {(["simple", "detailed", "challenge"] as ResponseMode[]).map((m) => {
          const isTrial = PRO_MODES.includes(m) && trialAvailable;
          const isLocked = PRO_MODES.includes(m) && !isPro && !isTrial;
          const isActive = mode === m && !isLocked;
          return (
            <button
              key={m}
              onClick={() => {
                if (isLocked) {
                  setLockReason(!isSignedIn ? "signup" : trial && !trial.available ? "used" : "pro");
                  setShowProPrompt(true);
                  return;
                }
                setShowProPrompt(false);
                setMode(m);
              }}
              title={isLocked ? "Pro feature" : undefined}
              className={`relative px-3 py-1 rounded-full transition-colors ${
                isActive
                  ? m === "challenge"
                    ? "text-red-600 dark:text-[#f0726a]"
                    : "text-amber-700 dark:text-[#e3d2ad]"
                  : isLocked
                  ? "text-[var(--text-muted)] opacity-70 cursor-not-allowed"
                  : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={`${layoutPrefix}-mode-pill`}
                  className={`absolute inset-0 rounded-full ${
                    m === "challenge" ? "bg-red-500/[0.14] dark:bg-[#f0726a]/[0.22]" : "bg-amber-500/[0.16] dark:bg-[#cbb994]/[0.20]"
                  }`}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                {m === "simple" ? t(lang, "modeSimple") : m === "detailed" ? t(lang, "modeDetailed") : t(lang, "modeChallenge")}
                {isLocked && (
                  <span className="text-[9px] font-medium tracking-wide text-amber-600 dark:text-[#cbb994]">PRO</span>
                )}
                {isTrial && (
                  <span className="text-[9px] font-medium tracking-wide px-1.5 py-px rounded-full bg-amber-500/15 dark:bg-[#cbb994]/20 text-amber-700 dark:text-[#e3d2ad]">
                    {t(lang, "trialBadge")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  /* Rendered by calling, not as <Composer/>: a component defined in here would
     remount every render and drop the textarea's focus mid-typing. */
  function renderComposer() {
    return (
      <div className="relative z-10 flex items-end gap-1.5 pl-2 pr-2 py-2 rounded-[28px] glass shadow-[0_8px_30px_rgb(0_0_0/0.08)] dark:shadow-[0_8px_30px_rgb(0_0_0/0.35)] focus-within:border-amber-400/60 dark:focus-within:border-[#cbb994]/35 transition-colors">
        <button
          onClick={() => setShowSources((s) => !s)}
          title="Sources"
          className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            showSources
              ? "text-amber-600 dark:text-[#cbb994] bg-[var(--active-bg)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
          }`}
        >
          <PlusIcon open={showSources} />
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t(lang, isPhone ? "chatPlaceholderShort" : "chatPlaceholder")}
          rows={1}
          className="flex-1 min-w-0 resize-none bg-transparent py-2.5 px-1 text-base sm:text-[15px] leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
        />
        {speechSupported && (
          <button
            onClick={toggleListening}
            title={listening ? "Stop listening" : "Speak your question"}
            className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              listening
                ? "text-red-500 dark:text-[#f0726a] bg-red-500/10"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
            }`}
          >
            {listening ? (
              <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                <MicIcon active />
              </motion.span>
            ) : (
              <MicIcon active={false} />
            )}
          </button>
        )}
        <motion.button
          onClick={() => {
            if (busy) stopStreaming();
            else if (input.trim()) sendMessage(input.trim());
          }}
          disabled={!input.trim() && !busy}
          whileTap={{ scale: 0.92 }}
          title={busy ? "Stop" : "Send"}
          className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
            busy
              ? "bg-red-500 hover:bg-red-600 dark:bg-[#f0726a] text-white dark:text-[#1c1813]"
              : "bg-amber-500 hover:bg-amber-600 dark:bg-[#e3d2ad] dark:hover:bg-[#f5efe3] text-white dark:text-[#1c1813]"
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {busy ? (
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
    );
  }

  function renderModeRow(layoutPrefix: string, centered: boolean) {
    return (
      <div className={`flex items-center gap-x-3 gap-y-2 flex-wrap ${centered ? "justify-center" : ""}`}>
        <ModeBar layoutPrefix={layoutPrefix} />
        <AnimatePresence mode="wait">
          <motion.span
            key={mode}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.18 }}
            className={`text-xs ${mode === "challenge" ? "text-red-500 dark:text-[#f0726a]" : "text-[var(--text-muted)]"}`}
          >
            {mode === "simple"
              ? t(lang, "modeSimpleDesc")
              : mode === "detailed"
              ? isPro ? t(lang, "modeDetailedDesc") : t(lang, "trialHint")
              : t(lang, "modeChallengeDesc")}
          </motion.span>
        </AnimatePresence>
      </div>
    );
  }

  function renderProPrompt() {
    return (
      <AnimatePresence>
        {showProPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="relative flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-[#1a160e] border border-amber-200 dark:border-[#cbb994]/20"
          >
            <p className="text-xs text-amber-800 dark:text-[#d8cfc0]">
              {lockReason === "signup" ? (
                <><span className="font-medium">{t(lang, "trialSignupTitle")}.</span> {t(lang, "trialSignupBody")}</>
              ) : lockReason === "used" ? (
                <><span className="font-medium">{t(lang, "trialUsedTitle")}</span> {t(lang, "trialUsedBody").replace("{when}", formatRetry(trial?.retryAt ?? null, lang))}</>
              ) : (
                <><span className="font-medium">Detailed mode is Pro only.</span> Unlock more messages + deep research.</>
              )}
            </p>
            <div className="flex items-center gap-3 shrink-0">
              {lockReason === "signup" ? (
                <SignUpButton mode="modal">
                  <button onClick={() => setShowProPrompt(false)} className="text-xs font-medium text-amber-600 dark:text-[#e3d2ad] hover:underline underline-offset-2">
                    {t(lang, "signUpFree")} →
                  </button>
                </SignUpButton>
              ) : (
                <a href="/#pricing" onClick={() => setShowProPrompt(false)} className="text-xs font-medium text-amber-600 dark:text-[#e3d2ad] hover:underline underline-offset-2">
                  See pricing →
                </a>
              )}
              <button onClick={() => setShowProPrompt(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm leading-none">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  /* Small "support me" card that floats above the composer every few answers. */
  function renderSupport() {
    return (
      <AnimatePresence>
        {showSupport && !isPro && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            role="dialog"
            aria-label={t(lang, "supportTitle")}
            className="absolute bottom-full right-0 mb-3 z-20 w-full sm:w-[340px] glass-card p-4 shadow-[0_12px_32px_rgb(0_0_0/0.12)] dark:shadow-[0_12px_32px_rgb(0_0_0/0.45)]"
          >
            <button
              onClick={() => setShowSupport(false)}
              aria-label="Close"
              className="absolute top-2.5 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm leading-none"
            >
              ✕
            </button>
            <div className="flex items-start gap-3 pr-4">
              <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-amber-100 dark:bg-[#2b2519] text-amber-600 dark:text-[#e3d2ad] text-sm">✦</span>
              <div>
                <p className="font-serif text-[17px] font-medium text-[var(--text-primary)] leading-snug">{t(lang, "supportTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{t(lang, "supportBody")}</p>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSupport(false)}
                className="px-3 py-1.5 rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
              >
                {t(lang, "supportDismiss")}
              </button>
              <a
                href="/#pricing"
                onClick={() => setShowSupport(false)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-amber-500 hover:bg-amber-600 dark:bg-[#cbb994] dark:hover:bg-[#e3d2ad] text-white dark:text-[#1c1813] transition-colors"
              >
                ✦ {t(lang, "supportCta")}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  function renderSources() {
    return (
      <AnimatePresence initial={false}>
        {showSources && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="relative z-10"
          >
            <SourcesPanel sources={sources} onChange={setSources} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">

      <AnimatePresence mode="wait" initial={false}>
        {!hasMessages ? (

          /* ══════════════════════════════════════
             WELCOME / HERO STATE
          ══════════════════════════════════════ */
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden scroll-thin"
          >
            {/* Phones: greeting fills the space, cards swipe sideways, composer sits at
                the bottom within thumb reach. sm and up: the centred stack. */}
            <div className="min-h-full flex flex-col px-4 pt-16 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:justify-center sm:pb-8 lg:py-[clamp(1.25rem,5vh,3rem)]">
              {/* Greeting */}
              <div className="order-1 sm:order-none flex-1 sm:flex-none flex flex-col items-center justify-center text-center py-6 sm:py-0">
                <motion.span
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.05 }}
                  className="block text-4xl short:text-3xl tiny:hidden leading-none text-amber-500 dark:text-[#f1dfb8] icon-glow select-none"
                  aria-hidden="true"
                >
                  ✝
                </motion.span>
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={now ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  data-text={greeting}
                  className="glow-text mt-[clamp(0.75rem,2vh,1.25rem)] font-serif text-[clamp(2.3rem,min(7.5vh,10vw),3.75rem)] font-medium tracking-[-0.02em] leading-[1.08] text-balance"
                >
                  {greeting}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={now ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.12 }}
                  className="mt-[clamp(0.5rem,1.6vh,1rem)] text-[17px] sm:text-xl short:text-lg font-light text-[var(--text-muted)] text-balance"
                >
                  {helpPrompt}
                </motion.p>
              </div>

              {/* Composer */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.18 }}
                className="order-3 sm:order-none relative w-full max-w-2xl mt-4 sm:mt-[clamp(1.25rem,4.5vh,2.5rem)] space-y-3"
              >
                <div aria-hidden="true" className="glow-haze absolute -inset-x-24 -inset-y-20" />
                {renderSources()}
                {renderComposer()}
                <div className="relative pt-0.5 sm:pt-1">{renderModeRow("hero", true)}</div>
                {renderProPrompt()}
              </motion.div>

              {/* Daily cards: a swipeable row on phones, a two-up grid from sm */}
              {now && (
                <div className="order-2 sm:order-none w-full max-w-3xl sm:mt-[clamp(1.25rem,5vh,3rem)]">
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.28 } }, hidden: {} }}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const card = el.firstElementChild as HTMLElement | null;
                      if (card) setCardIndex(Math.round(el.scrollLeft / (card.offsetWidth + 12)));
                    }}
                    className="no-scrollbar -mx-4 px-4 scroll-px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:gap-4 short:sm:gap-3 sm:overflow-visible"
                  >
                    <WelcomeCard
                      icon={<BookIcon />}
                      label={t(lang, "verseOfDay")}
                      action={t(lang, "reflectDeeper")}
                      onAction={() => sendMessage(`${t(lang, "reflectPrompt")} "${verse.text}" (${verse.ref})`)}
                    >
                      <p className="font-serif italic text-[15px] sm:text-[17px] short:sm:text-[15px] line-clamp-3 sm:line-clamp-none tiny:line-clamp-2 leading-relaxed text-[var(--text-body)]">&ldquo;{verse.text}&rdquo;</p>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">— {verse.ref}</p>
                    </WelcomeCard>
                    <WelcomeCard
                      icon={<LightbulbIcon />}
                      label={t(lang, "tryAsking")}
                      accent
                      action={t(lang, "askThis")}
                      onAction={() => sendMessage(suggestion)}
                    >
                      <p className="text-[15px] sm:text-[17px] short:sm:text-[15px] leading-relaxed text-[var(--text-body)]">{suggestion}</p>
                    </WelcomeCard>
                    {/* A third card only on phones, where swiping makes room for it */}
                    <WelcomeCard
                      icon={<LightbulbIcon />}
                      label={t(lang, "tryAsking")}
                      accent
                      phoneOnly
                      action={t(lang, "askThis")}
                      onAction={() => sendMessage(suggestion2)}
                    >
                      <p className="text-[15px] leading-relaxed text-[var(--text-body)]">{suggestion2}</p>
                    </WelcomeCard>
                  </motion.div>
                  {/* Position dots, phones only */}
                  <div className="sm:hidden flex justify-center gap-1.5 mt-3" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          cardIndex === i ? "w-5 bg-amber-500 dark:bg-[#cbb994]" : "w-1.5 bg-[var(--border)]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

        ) : (

          /* ══════════════════════════════════════
             ACTIVE CHAT STATE
          ══════════════════════════════════════ */
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Messages */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden scroll-thin">
              <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-16 lg:pt-10 short:lg:pt-6 pb-8 space-y-7">
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) =>
                    msg.role === "assistant" && NOTICES.has(msg.content) ? (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl px-5 py-4 bg-amber-50 dark:bg-[#1a160e] border border-amber-200 dark:border-[#cbb994]/20 space-y-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-amber-500 dark:text-[#cbb994] text-base leading-none mt-0.5">✦</span>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)] mb-0.5">
                              {msg.content === "trial_used"
                                ? t(lang, "trialUsedTitle")
                                : msg.content === "trial_signup"
                                ? t(lang, "trialSignupTitle")
                                : msg.content === "pro_required"
                                ? "Detailed mode requires a Pro subscription."
                                : !isSignedIn
                                ? "You've used your 3 free trial messages."
                                : isPro
                                ? "You've reached your Pro daily limit for this mode."
                                : "You've used your 12 free messages for today."}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {msg.content === "trial_used"
                                ? t(lang, "trialUsedBody").replace("{when}", formatRetry(trial?.retryAt ?? null, lang))
                                : msg.content === "trial_signup"
                                ? t(lang, "trialSignupBody")
                                : msg.content === "pro_required"
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
                                <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 dark:bg-[#cbb994] dark:hover:bg-[#e3d2ad] text-white dark:text-[#1c1813] text-xs font-medium transition-colors">
                                  Create free account
                                </button>
                              </SignUpButton>
                              <SignInButton mode="modal">
                                <button className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-body)] text-xs font-medium hover:bg-[var(--hover-bg)] transition-colors">
                                  Sign in
                                </button>
                              </SignInButton>
                            </>
                          ) : (
                            <>
                              <a href="/#pricing" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 dark:bg-[#cbb994] dark:hover:bg-[#e3d2ad] text-white dark:text-[#1c1813] text-xs font-medium transition-colors">
                                ✦ {isPro ? "View plan" : "Upgrade to Pro"}
                              </a>
                              {msg.content === "daily_limit" && !isPro && (
                                <p className="text-[11px] text-[var(--text-muted)] self-center">or come back tomorrow for free</p>
                              )}
                            </>
                          )}
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
                    >
                      <TypingIndicator />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input area */}
            <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2">
              <div className="relative mx-auto w-full max-w-3xl space-y-2.5">
                {renderSupport()}
                {renderProPrompt()}
                {renderSources()}
                {renderComposer()}
                <div className="flex items-center justify-between gap-3 flex-wrap px-1">
                  {renderModeRow("chat", false)}
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={handlePrint}
                      title="Print / Save as PDF"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <PrintIcon />
                      {t(lang, "printBtn")}
                    </button>
                    <button
                      onClick={clearHistory}
                      title="Clear conversation"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[var(--text-muted)] hover:text-red-500 dark:hover:text-[#f0726a] hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <TrashIcon />
                      {t(lang, "clearBtn")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="print-chat" style={{ display: "none" }} />
    </div>
  );
}

function WelcomeCard({
  icon, label, accent = false, phoneOnly = false, action, onAction, children,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
  phoneOnly?: boolean;
  action: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } },
      }}
      className={`snap-start shrink-0 w-[82%] sm:w-auto flex flex-col items-start text-left sm:items-center sm:text-center px-5 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-5 short:sm:px-5 short:sm:pt-4 short:sm:pb-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] ${
        phoneOnly ? "sm:hidden" : ""
      }`}
    >
      <div className="flex items-center gap-2.5 sm:flex-col sm:gap-0">
        <span
          className={`w-8 h-8 sm:w-11 sm:h-11 short:sm:w-9 short:sm:h-9 tiny:hidden shrink-0 rounded-full flex items-center justify-center ${
            accent
              ? "bg-amber-100 dark:bg-[#2b2519] text-amber-600 dark:text-[#e3d2ad]"
              : "bg-[var(--surface-2)] text-[var(--text-body)]"
          }`}
        >
          {icon}
        </span>
        <p className={`sm:mt-4 short:sm:mt-3 tiny:mt-0 text-[11px] sm:text-xs font-medium uppercase tracking-[0.08em] ${accent ? "text-amber-600 dark:text-[#cbb994]" : "text-[var(--text-body)]"}`}>
          {label}
        </p>
      </div>
      <div className="mt-2.5 sm:mt-3 short:sm:mt-2 flex-1">{children}</div>
      <button
        onClick={onAction}
        className="mt-3 sm:mt-5 short:sm:mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] hover:text-amber-600 dark:hover:text-[#e3d2ad] transition-colors group"
      >
        {action}
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </button>
    </motion.div>
  );
}

const lineIcon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

function SendIcon() {
  return (
    <svg className="w-[18px] h-[18px]" {...lineIcon} strokeWidth={2}>
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <rect x="5" y="5" width="14" height="14" rx="2.5" />
    </svg>
  );
}

function PlusIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-5 h-5 transition-transform duration-200 ${open ? "rotate-45" : ""}`} {...lineIcon}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" {...lineIcon}>
      <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg className="w-3.5 h-3.5" {...lineIcon}>
      <path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6H7z" />
    </svg>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px]" {...lineIcon} fill={active ? "currentColor" : "none"}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="w-5 h-5" {...lineIcon}>
      <path d="M12 6.5C10.5 5.3 8.5 4.75 6 4.75c-1 0-2 .1-3 .35v13.5c1-.25 2-.35 3-.35 2.5 0 4.5.55 6 1.75m0-13.5c1.5-1.2 3.5-1.75 6-1.75 1 0 2 .1 3 .35v13.5c-1-.25-2-.35-3-.35-2.5 0-4.5.55-6 1.75m0-13.5V20" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg className="w-5 h-5" {...lineIcon}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.45 1 1.15 1 1.9V16h5v-.2c0-.75.4-1.45 1-1.9A6 6 0 0 0 12 3Z" />
    </svg>
  );
}
