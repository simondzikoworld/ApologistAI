"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { LegalFooter } from "@/components/LegalPage";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup, type Variants } from "framer-motion";
import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useIsPro } from "@/lib/useIsPro";
import ChatInterface from "@/components/ChatInterface";
import HomeHero from "@/components/HomeHero";
import AnimatedThemeToggler from "@/components/AnimatedThemeToggler";
import { t, tArr, type Lang } from "@/lib/i18n";
import { DAILY_VERSES_BY_LANG } from "@/data/dailyVerses";

const BMC_URL = "https://buymeacoffee.com/apologistai";

type EaseOut = "easeOut";
type EaseIn = "easeIn";
const OUT: EaseOut = "easeOut";
const IN: EaseIn = "easeIn";

// ---------------------------------------------------------------------------
// Daily verse rotation
// ---------------------------------------------------------------------------


function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}


// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const backButtonVariants: Variants = {
  hidden:  { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 380, damping: 28 } },
  exit:    { opacity: 0, x: -16, transition: { duration: 0.2 } },
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const isPro = useIsPro();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!langDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [langDropdownOpen]);
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>();
  const [chatKey, setChatKey] = useState(0);
  // Starts as English on both server and browser, then switches to the saved
  // language after mount; reading it during render broke hydration for everyone else.
  const [lang, setLang] = useState<Lang>("EN");
  const langLoaded = useRef(false);
  const [readings, setReadings] = useState<{ date: string; readings: Array<{ title: string; reference: string; subtitle: string; text: string }> } | null>(null);
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [readingsError, setReadingsError] = useState(false);
  const [expandedReading, setExpandedReading] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cd-lang") as Lang | null;
    if (saved) setLang(saved);
    langLoaded.current = true;
  }, []);

  // Persist selected language (not the English placeholder used before loading).
  useEffect(() => {
    if (langLoaded.current) localStorage.setItem("cd-lang", lang);
  }, [lang]);

  // Lock page scroll when chat is fullscreen; clear pending question when chat closes
  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    if (!expanded) setPendingQuestion(undefined);
    return () => { document.body.style.overflow = ""; };
  }, [expanded]);

  const dailyVerse = useMemo(() => {
    const verses = DAILY_VERSES_BY_LANG[lang] ?? DAILY_VERSES_BY_LANG["EN"];
    return verses[getDayOfYear() % verses.length];
  }, [lang]);

  useEffect(() => {
    setReadings(null);
    setReadingsError(false);
    setReadingsLoading(true);
    fetch(`/api/daily-reading?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReadings(data);
        setExpandedReading(0);
      })
      .catch(() => setReadingsError(true))
      .finally(() => setReadingsLoading(false));
  }, [lang]);

  async function handleProCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setCheckoutLoading(false);
    } catch {
      setCheckoutLoading(false);
    }
  }

  // Handle return from Stripe checkout — wait for user to load before reloading session
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.history.replaceState({}, "", "/");
      user.reload().then(() => window.location.reload());
    }
  }, [user]);

  function openWithQuestion(q: string) {
    if (isSignedIn && !q) {
      router.push("/chat");
      return;
    }
    if (isSignedIn) {
      // The chat page asks it straight away (see app/chat/page.tsx).
      router.push(`/chat?q=${encodeURIComponent(q)}`);
      return;
    }
    setChatKey(k => k + 1);
    setPendingQuestion(q || undefined);
    setExpanded(true);
  }

  return (
    <LayoutGroup>
      {/* First screen: page colour, with warm light falling from above */}
      <div className="relative min-h-[100svh] overflow-hidden bg-[var(--page-bg)]">
        <div aria-hidden="true" className="hero-light absolute inset-0" />

        {/* Top nav — only when not expanded */}
        <AnimatePresence>
          {!expanded && (
            <motion.nav
              key="top-nav"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: OUT } }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2, ease: IN } }}
              className="absolute top-0 left-0 right-0 z-[55] flex items-center py-4 px-4 sm:px-8"
            >
              {/* Left — hamburger (mobile) / language selector (desktop) */}
              <div className="flex items-center gap-1">
                {/* Hamburger — mobile only */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                  aria-label="Open menu"
                >
                  <span className="w-5 h-0.5 bg-slate-600 dark:bg-[#d8cfc0] rounded-full" />
                  <span className="w-5 h-0.5 bg-slate-600 dark:bg-[#d8cfc0] rounded-full" />
                  <span className="w-5 h-0.5 bg-slate-600 dark:bg-[#d8cfc0] rounded-full" />
                </button>
                <a href="/" className="flex items-center gap-2.5 ml-1 md:ml-0">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 dark:bg-[#2b2519] text-amber-600 dark:text-[var(--gold)] text-sm leading-none">✝</span>
                  <span className="font-serif text-xl font-semibold tracking-tight text-[var(--text-primary)]">Apologist AI</span>
                </a>
              </div>

              {/* Centre — nav links (desktop only) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-0.5"
                onMouseLeave={() => setHoveredNav(null)}
              >
                {([
                  { href: "#", label: t(lang, "navHome"), accent: false },
                  { href: "#mission", label: t(lang, "navMission"), accent: false },
                  { href: "#common-questions", label: t(lang, "navCommonQuestions"), accent: false },
                  { href: "#daily-reading", label: t(lang, "navDailyReading"), accent: false },
                  { href: "#pricing", label: t(lang, "navPricing"), accent: true },
                ] as const).map(({ href, label, accent }) => (
                  <a
                    key={href}
                    href={href}
                    onMouseEnter={() => setHoveredNav(href)}
                    className={`relative px-3 py-1.5 rounded-full text-sm transition-colors duration-100 ${
                      accent
                        ? "text-amber-600 dark:text-[var(--gold)]"
                        : hoveredNav === href
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-muted)]"
                    }`}
                  >
                    {hoveredNav === href && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-amber-100/80 dark:bg-white/[0.07] border border-amber-200/60 dark:border-white/[0.10] backdrop-blur-sm"
                        transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </a>
                ))}
              </div>

              {/* Right — auth + dark mode toggle */}
              <div className="ml-auto flex items-center gap-2">
                {/* Language selector — dropdown (all screen sizes) */}
                <div className="relative" ref={langDropdownRef}>
                  <button
                    onClick={() => setLangDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
                  >
                    <span>{lang === "EN" ? "🇬🇧" : lang === "PL" ? "🇵🇱" : lang === "ES" ? "🇪🇸" : lang === "FR" ? "🇫🇷" : lang === "DE" ? "🇩🇪" : "🇧🇷"}</span>
                    <span>{lang}</span>
                    <svg className={`w-3 h-3 transition-transform text-slate-400 ${langDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {langDropdownOpen && (
                      <>
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-[#1e1a16] border border-slate-200 dark:border-[#2c2722] rounded-xl shadow-lg overflow-hidden min-w-[140px]"
                        >
                          {(["EN", "PL", "ES", "FR", "DE", "PT"] as const).map((l) => (
                            <button
                              key={l}
                              onClick={() => { setLang(l); setLangDropdownOpen(false); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                                lang === l
                                  ? "bg-amber-50 dark:bg-[#2b2519] text-amber-700 dark:text-[#cbb994] font-semibold"
                                  : "text-slate-600 dark:text-[#d8cfc0] hover:bg-slate-50 dark:hover:bg-[#2c2722]"
                              }`}
                            >
                              <span className="text-base">{l === "EN" ? "🇬🇧" : l === "PL" ? "🇵🇱" : l === "ES" ? "🇪🇸" : l === "FR" ? "🇫🇷" : l === "DE" ? "🇩🇪" : "🇧🇷"}</span>
                              <span>{l === "EN" ? "English" : l === "PL" ? "Polski" : l === "ES" ? "Español" : l === "FR" ? "Français" : l === "DE" ? "Deutsch" : "Português"}</span>
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {isSignedIn ? (
                  <div className="relative">
                    <UserButton />
                    {isPro && (
                      <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-amber-500 text-white px-1 py-px rounded-full leading-none pointer-events-none select-none">
                        PRO
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <SignInButton mode="modal">
                      <button className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-full bg-amber-500 dark:bg-[#e3d2ad] hover:bg-amber-600 dark:hover:bg-[#f5efe3] text-white dark:text-[#1c1813] text-xs font-medium transition-colors">
                        {t(lang, "signUpFree")}
                      </button>
                    </SignUpButton>
                  </>
                )}
                <AnimatedThemeToggler />
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        {/* Mobile sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="sidebar-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
              {/* Panel */}
              <motion.div
                key="sidebar-panel"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="fixed top-0 left-0 h-full w-72 z-[80] bg-white dark:bg-[#141210] shadow-2xl dark:shadow-black/60 flex flex-col"
              >
                {/* Sidebar header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#2c2722]">
                  <div className="flex items-center">
                    <Image
                      src="/apologist.png"
                      alt="Apologist AI"
                      width={140}
                      height={50}
                      className="h-8 w-auto dark:brightness-0 dark:invert"
                    />
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#d8cfc0] hover:bg-slate-100 dark:hover:bg-[#2c2722] transition-colors text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>

                {/* Nav links */}
                <nav className="flex flex-col gap-1 px-3 py-4">
                  {[
                    { href: "#", label: t(lang, "navHome") },
                    { href: "#mission", label: t(lang, "navMission") },
                    { href: "#common-questions", label: t(lang, "navCommonQuestions") },
                    { href: "#daily-reading", label: t(lang, "navDailyReading") },
                  ].map(({ href, label }) => (
                    <a
                      key={href}
                      href={href}
                      onClick={() => setSidebarOpen(false)}
                      className="px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-[#d8cfc0] hover:bg-amber-50 dark:hover:bg-[#2c2722] hover:text-amber-700 dark:hover:text-[#cbb994] transition-colors"
                    >
                      {label}
                    </a>
                  ))}
                  <a
                    href="#pricing"
                    onClick={() => setSidebarOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-semibold text-amber-600 dark:text-[#cbb994] hover:bg-amber-50 dark:hover:bg-[#2c2722] transition-colors flex items-center gap-2"
                  >
                    {t(lang, "navPricing")}
                  </a>
                </nav>

                {/* Divider */}
                <div className="mx-5 border-t border-slate-100 dark:border-[#2c2722]" />

                {/* Language selector */}
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Language</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["EN", "PL", "ES", "FR", "DE", "PT"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLang(l); setSidebarOpen(false); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          lang === l
                            ? "bg-amber-500 dark:bg-[#cbb994] text-white dark:text-[#1c1813]"
                            : "bg-slate-100 dark:bg-[#2c2722] text-slate-600 dark:text-[#d8cfc0] hover:bg-amber-100 dark:hover:bg-[#2b2519] hover:text-amber-700 dark:hover:text-[#cbb994]"
                        }`}
                      >
                        <span>{l === "EN" ? "🇬🇧" : l === "PL" ? "🇵🇱" : l === "ES" ? "🇪🇸" : l === "FR" ? "🇫🇷" : l === "DE" ? "🇩🇪" : "🇧🇷"}</span>
                        <span>{l === "EN" ? "English" : l === "PL" ? "Polski" : l === "ES" ? "Español" : l === "FR" ? "Français" : l === "DE" ? "Deutsch" : "Português"}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auth */}
                <div className="mx-5 border-t border-slate-100 dark:border-[#2c2722]" />
                <div className="px-5 py-4 space-y-2">
                  {isSignedIn ? (
                    <div className="flex items-center gap-3 px-1">
                      <UserButton />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-[#f5efe3]">{user?.firstName ?? "Account"}</p>
                        {isPro && <p className="text-xs text-amber-500 dark:text-[#cbb994] font-bold">✦ Pro</p>}
                      </div>
                    </div>
                  ) : (
                    <>
                      <SignInButton mode="modal">
                        <button onClick={() => setSidebarOpen(false)} className="flex items-center justify-center w-full py-2.5 rounded-xl border border-slate-200 dark:border-[#2c2722] text-sm font-semibold text-slate-700 dark:text-[#d8cfc0] hover:bg-slate-50 dark:hover:bg-[#2c2722] transition-colors">
                          Sign in
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button onClick={() => setSidebarOpen(false)} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors">
                          ✦ Get Pro
                        </button>
                      </SignUpButton>
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Back button — only when expanded */}
        <AnimatePresence>
          {expanded && (
            <motion.button
              key="back-btn"
              variants={backButtonVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setExpanded(false)}
              className="fixed top-6 left-6 z-[60] flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] dark:bg-white/[0.06] backdrop-blur-xl border border-white/20 dark:border-white/[0.12] text-slate-700 dark:text-[#d8cfc0] text-sm font-medium shadow-lg hover:bg-white/20 dark:hover:bg-white/[0.10] hover:border-white/30 dark:hover:border-[#cbb994]/30 hover:text-slate-900 dark:hover:text-[#f5efe3] transition-all duration-200"
            >
              <span className="text-base leading-none opacity-70">←</span>
              Back
            </motion.button>
          )}
        </AnimatePresence>

        <section className="relative z-10 min-h-[100svh] flex flex-col px-5 sm:px-8 lg:px-12 pt-20">
          <AnimatePresence>
            {!expanded && <HomeHero key="hero" lang={lang} verse={dailyVerse} onAsk={openWithQuestion} />}
          </AnimatePresence>
        </section>

        {/* The full chat, grown out of the hero's input (shared layoutId). */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              key="chat"
              layoutId="chat-card"
              transition={{ layout: { type: "spring", stiffness: 260, damping: 30 } }}
              className="fixed inset-0 z-50 overflow-hidden bg-[var(--page-bg)] flex justify-center"
            >
              <div className="w-full max-w-3xl h-full">
                <ChatInterface key={chatKey} initialQuestion={pendingQuestion} startFresh={true} lang={lang} isPro={isPro} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ----------------------------------------------------------------
          ABOUT — below the fold (outside the hero div so crucifix stays centered)
      ---------------------------------------------------------------- */}
      <section id="mission" className="bg-white dark:bg-[#0a0908] border-t border-slate-100 dark:border-[#2c2722] px-6 sm:px-10 lg:px-12 xl:px-20 py-12 lg:py-20">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-amber-500 dark:text-[#cbb994] text-2xl">✝</span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-[#f5efe3]">{t(lang, "aboutTitle")}</h2>
            </div>
            <p className="text-slate-600 dark:text-[#d8cfc0] leading-relaxed mb-6 text-base">
              {t(lang, "aboutP1")}
            </p>
            <p className="text-slate-600 dark:text-[#d8cfc0] leading-relaxed mb-6 text-base">
              {t(lang, "aboutP2")}
            </p>

            {/* Feature cards */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.13 } } }}
            >
              {([
                { n: "1" as const, glow: "bg-amber-400/20 dark:bg-[#cbb994]/10", iconBg: "bg-amber-100 dark:bg-[#2b2519]", iconColor: "text-amber-600 dark:text-[#cbb994]", border: "hover:border-amber-300/60 dark:hover:border-[#cbb994]/30" },
                { n: "2" as const, glow: "bg-sky-400/15 dark:bg-sky-900/20",      iconBg: "bg-sky-50   dark:bg-sky-950/60",  iconColor: "text-sky-600   dark:text-sky-400",    border: "hover:border-sky-300/50   dark:hover:border-sky-700/50" },
                { n: "3" as const, glow: "bg-rose-400/15 dark:bg-rose-900/20",    iconBg: "bg-rose-50  dark:bg-rose-950/60", iconColor: "text-rose-600  dark:text-rose-400",   border: "hover:border-rose-300/50  dark:hover:border-rose-700/50" },
              ]).map(({ n, glow, iconBg, iconColor, border }, i) => (
                <motion.div
                  key={n}
                  variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }}
                  whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
                  className={`relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-white/[0.07] bg-white/70 dark:bg-white/[0.03] backdrop-blur-sm p-6 cursor-default transition-colors duration-200 ${border}`}
                >
                  {/* Ambient glow */}
                  <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full ${glow} blur-2xl pointer-events-none`} />

                  {/* Icon badge */}
                  <div className={`relative w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center text-xl mb-5 shadow-sm`}>
                    <span className={iconColor}>{t(lang, `feature${n}Icon` as Parameters<typeof t>[1])}</span>
                  </div>

                  {/* Title */}
                  <h3 className="relative text-[15px] font-bold text-slate-900 dark:text-[#f5efe3] mb-2 leading-snug">
                    {t(lang, `feature${n}Title` as Parameters<typeof t>[1])}
                  </h3>

                  {/* Body */}
                  <p className="relative text-sm text-slate-500 dark:text-[#9d9484] leading-relaxed">
                    {t(lang, `feature${n}Body` as Parameters<typeof t>[1])}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Buy Me a Coffee callout */}
            <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-amber-50 dark:bg-[#1e1a16] border border-amber-200 dark:border-[#2c2722] rounded-2xl px-5 py-4">
              <p className="text-sm text-slate-600 dark:text-[#d8cfc0] leading-relaxed flex-1">
                {t(lang, "buyMeCoffeeText")}
              </p>
              <a
                href={BMC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFDD00] hover:bg-yellow-300 text-slate-900 text-sm font-bold shadow-sm transition-colors"
              >
                ☕ {t(lang, "buyMeCoffeeBtn")}
              </a>
            </div>

            <blockquote className="mt-12 border-l-4 border-amber-400 pl-6">
              <p className="text-lg italic text-slate-500 dark:text-[#9d9484] leading-relaxed">
                &ldquo;{t(lang, "aboutQuote")}&rdquo;
              </p>
              <footer className="mt-2 text-sm text-amber-600 font-semibold">{t(lang, "aboutQuoteRef")}</footer>
            </blockquote>
          </div>
      </section>

      {/* ----------------------------------------------------------------
          COMMON QUESTIONS — below Our Mission
      ---------------------------------------------------------------- */}
      <section id="common-questions" className="bg-slate-50 dark:bg-[#141210] border-t border-slate-100 dark:border-[#2c2722] px-6 sm:px-10 lg:px-12 xl:px-20 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-amber-500 dark:text-[#cbb994] text-2xl">⚔</span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-[#f5efe3]">{t(lang, "commonQuestionsTitle")}</h2>
          </div>
          <p className="text-slate-500 dark:text-[#9d9484] text-sm mb-8 leading-relaxed">{t(lang, "commonQuestionsSub")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tArr(lang, "objections").map((q) => (
              <button
                key={q}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setTimeout(() => openWithQuestion(q), 300);
                }}
                className="group flex items-start gap-3 text-left px-5 py-4 rounded-2xl bg-white dark:bg-[#1e1a16] border border-slate-200 dark:border-[#2c2722] hover:border-amber-300 dark:hover:border-[#cbb994]/40 hover:bg-amber-50 dark:hover:bg-[#2c2722] transition-colors shadow-sm"
              >
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-[#2b2519] flex items-center justify-center text-amber-600 dark:text-[#cbb994] text-[10px] font-bold group-hover:bg-amber-200 dark:group-hover:bg-[#cbb994]/20 transition-colors">?</span>
                <span className="text-sm font-medium text-slate-700 dark:text-[#d8cfc0] leading-snug">{q}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          DAILY READING — below Our Mission
      ---------------------------------------------------------------- */}
      <section id="daily-reading" className="bg-amber-50 dark:bg-[#0a0908] border-t border-amber-100 dark:border-[#2c2722] px-6 sm:px-10 lg:px-12 xl:px-20 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="text-amber-500 dark:text-[#cbb994] text-2xl">✝</span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-[#f5efe3]">{t(lang, "dailyReadingTitle")}</h2>
                {readings && (
                  <p className="text-xs text-slate-400 mt-0.5">{readings.date}</p>
                )}
              </div>
            </div>
            <a
              href="https://universalis.com/mass.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2"
            >
              {t(lang, "dailyReadingSource")}
            </a>
          </div>

          {readingsLoading && (
            <div className="flex gap-2 items-center py-8 justify-center">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
              <span className="ml-2 text-sm text-slate-400">{t(lang, "dailyReadingLoading")}</span>
            </div>
          )}

          {readingsError && (
            <p className="text-sm text-slate-400 italic py-8 text-center">{t(lang, "dailyReadingError")}</p>
          )}

          {readings && !readingsLoading && (
            <div className="space-y-3">
              {readings.readings.map((r, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#141210] border border-amber-100 dark:border-[#2c2722] rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedReading(expandedReading === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-amber-50 dark:hover:bg-[#1e1a16] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-widest text-amber-600 shrink-0">{r.title}</span>
                        {r.reference && (
                          <span className="text-xs text-slate-400">{r.reference}</span>
                        )}
                      </div>
                      {r.subtitle && (
                        <p className="text-sm font-medium text-slate-700 dark:text-[#d8cfc0] mt-0.5 truncate">{r.subtitle}</p>
                      )}
                    </div>
                    <motion.span
                      animate={{ rotate: expandedReading === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-slate-400 text-sm leading-none shrink-0 ml-4"
                    >
                      ▾
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedReading === i && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-amber-100 dark:border-[#2c2722] pt-4">
                          {r.text.split("\n\n").map((para, j) => (
                            <p key={j} className="text-sm text-slate-700 dark:text-[#d8cfc0] leading-relaxed mb-3 last:mb-0 italic">
                              {para}
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          PRICING — below Daily Reading
      ---------------------------------------------------------------- */}
      <section id="pricing" className="bg-white dark:bg-[#141210] border-t border-slate-100 dark:border-[#2c2722] px-6 sm:px-10 lg:px-12 xl:px-20 py-12 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-amber-500 dark:text-[#cbb994] text-2xl">✦</span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-[#f5efe3]">{t(lang, "pricingTitle")}</h2>
          </div>
          <p className="text-slate-500 dark:text-[#9d9484] text-sm mb-10 leading-relaxed">
            {t(lang, "pricingSub")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Free card */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#2c2722] bg-slate-50 dark:bg-[#1e1a16] p-6 flex flex-col">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#9d9484] mb-1">{t(lang, "pricingFreeName")}</p>
                <p className="text-3xl font-black text-slate-900 dark:text-[#f5efe3]">£0</p>
                <p className="text-xs text-slate-400 dark:text-[#9d9484] mt-0.5">{t(lang, "pricingFreeForever")}</p>
                <p className="text-xs text-slate-400 dark:text-[#9d9484] mt-1.5 italic">{t(lang, "pricingFreeTagline")}</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {tArr(lang, "pricingFreeFeatures").map((text, i) => {
                  const ok = i < 4;
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${ok ? "bg-amber-100 dark:bg-[#2b2519] text-amber-600 dark:text-[#cbb994]" : "bg-slate-200 dark:bg-[#2c2722] text-slate-400 dark:text-[#7c7468]"}`}>
                        {ok ? "✓" : "✕"}
                      </span>
                      <span className={`text-sm leading-snug ${ok ? "text-slate-700 dark:text-[#d8cfc0]" : "text-slate-400 dark:text-[#7c7468]"}`}>{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-[#2c2722] text-sm font-semibold text-slate-600 dark:text-[#d8cfc0] hover:bg-slate-100 dark:hover:bg-[#2c2722] transition-colors"
              >
                {t(lang, "pricingStartFree")}
              </button>
            </div>

            {/* Pro card */}
            <div className="rounded-2xl border-2 border-amber-400 dark:border-[#cbb994]/60 bg-gradient-to-br from-amber-50 to-white dark:from-[#2b2519] dark:to-[#141210] p-6 flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-[#cbb994] bg-amber-100 dark:bg-[#2b2519] px-2 py-1 rounded-full">{t(lang, "pricingProPopular")}</span>
              </div>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-500 dark:text-[#cbb994] mb-1">Pro</p>
                <div className="flex items-end gap-1.5 flex-wrap">
                  <p className="text-xl font-semibold text-slate-400 dark:text-[#7c7468] line-through decoration-2 decoration-slate-400/70 dark:decoration-[#7c7468]/70 mb-0.5">£15</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-[#f5efe3]">£7</p>
                  <p className="text-sm text-slate-400 dark:text-[#9d9484] mb-1">{t(lang, "pricingProMonth")}</p>
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-[#1c1813] bg-amber-200/80 dark:bg-[#cbb994] px-2 py-0.5 rounded-full">
                    {t(lang, "pricingProDiscount")}
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-[#9d9484] mt-0.5">{t(lang, "pricingProCancelAnytime")}</p>
                <p className="text-xs text-amber-600 dark:text-[#cbb994] mt-1.5 italic font-medium">{t(lang, "pricingProTagline")}</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {tArr(lang, "pricingProFeatures").map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-amber-100 dark:bg-[#2b2519] flex items-center justify-center text-[10px] font-bold text-amber-600 dark:text-[#cbb994]">✓</span>
                    <span className="text-sm text-slate-700 dark:text-[#d8cfc0] leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
              {isPro ? (
                <div className="w-full py-2.5 rounded-xl bg-amber-100 dark:bg-[#2b2519] text-amber-700 dark:text-[#cbb994] text-sm font-bold text-center">
                  {t(lang, "pricingCurrentPlan")}
                </div>
              ) : isSignedIn ? (
                <button
                  onClick={handleProCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-500 dark:bg-[#cbb994] hover:bg-amber-600 dark:hover:bg-[#e3d2ad] text-white dark:text-[#1c1813] text-sm font-bold text-center shadow-sm shadow-amber-200 dark:shadow-black/30 transition-colors disabled:opacity-60"
                >
                  {checkoutLoading ? t(lang, "pricingRedirecting") : t(lang, "pricingUpgradePro")}
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className="w-full py-2.5 rounded-xl bg-amber-500 dark:bg-[#cbb994] hover:bg-amber-600 dark:hover:bg-[#e3d2ad] text-white dark:text-[#1c1813] text-sm font-bold text-center shadow-sm shadow-amber-200 dark:shadow-black/30 transition-colors">
                    {t(lang, "pricingSignIn")}
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
          <p className="max-w-2xl mx-auto mt-6 text-center text-xs leading-relaxed text-slate-400 dark:text-[#7c7468]">
            Pro renews automatically every month until cancelled. Cancel anytime; you keep Pro until the end of the paid period.
            By subscribing you agree to the <Link href="/terms" className="underline">Terms of Use</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </section>

      <footer className="px-6 sm:px-10 lg:px-12 xl:px-20 pb-10">
        <div className="max-w-3xl mx-auto">
          <LegalFooter />
        </div>
      </footer>
    </LayoutGroup>
  );
}

