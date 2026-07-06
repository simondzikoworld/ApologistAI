"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup, type Variants } from "framer-motion";
import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import ChatInterface from "@/components/ChatInterface";
import ChatPreview from "@/components/ChatPreview";
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

const heroWordmarkVariants: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: OUT } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.25, ease: IN } },
};

const heroHeadlineVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: OUT, delay: 0.1 } },
  exit:    { opacity: 0, y: 10, transition: { duration: 0.22, ease: IN } },
};

const heroSubtextVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: OUT, delay: 0.2 } },
  exit:    { opacity: 0, y: 8, transition: { duration: 0.2, ease: IN } },
};

const heroBulletsVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, delay: 0.32, staggerChildren: 0.08 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
};

const bulletItemVariants: Variants = {
  hidden: { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: OUT } },
};

const heroBadgesVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: OUT, delay: 0.52 } },
  exit:    { opacity: 0, y: 8, transition: { duration: 0.18 } },
};

const heroVerseVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, delay: 0.65 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

const tryLabelVariants: Variants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.7 } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.2 } },
};

const backButtonVariants: Variants = {
  hidden:  { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 380, damping: 28 } },
  exit:    { opacity: 0, x: -16, transition: { duration: 0.2 } },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HeroBullets({ lang }: { lang: Lang }) {
  return (
    <motion.ul
      variants={heroBulletsVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-2.5"
    >
      {tArr(lang, "bullets").map((b) => (
        <motion.li key={b} variants={bulletItemVariants} className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-[11px] font-bold">
            ✓
          </span>
          <span className="text-sm text-slate-600 dark:text-[#d8cfc0] leading-snug">{b}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function AppStoreBadges({ lang }: { lang: Lang }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">{t(lang, "comingToMobile")}</p>
      <div className="flex gap-3">
        {[
          { icon: "🍎", line1: "App Store", line2: "Download on the" },
          { icon: "▶", line1: "Google Play", line2: "Get it on" },
        ].map(({ icon, line1, line2 }) => (
          <div
            key={line1}
            title={t(lang, "comingSoon")}
            className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 opacity-50 cursor-not-allowed select-none"
          >
            <span className="text-white text-lg leading-none">{icon}</span>
            <div>
              <p className="text-[9px] text-slate-400 leading-none mb-0.5">{line2}</p>
              <p className="text-white text-sm font-semibold leading-none">{line1}</p>
            </div>
            <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-amber-400 font-semibold tracking-wide">{t(lang, "comingSoon")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const isPro = (user?.publicMetadata?.isPro as boolean) ?? false;
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
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "EN";
    return (localStorage.getItem("cd-lang") as Lang) ?? "EN";
  });
  const [readings, setReadings] = useState<{ date: string; readings: Array<{ title: string; reference: string; subtitle: string; text: string }> } | null>(null);
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [readingsError, setReadingsError] = useState(false);
  const [expandedReading, setExpandedReading] = useState<number | null>(null);

  // Persist selected language
  useEffect(() => {
    localStorage.setItem("cd-lang", lang);
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
    if (isSignedIn) {
      router.push("/chat");
      return;
    }
    setChatKey(k => k + 1);
    setPendingQuestion(q);
    setExpanded(true);
  }

  return (
    <LayoutGroup>
      {/* Full-viewport background */}
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-amber-50/30 to-slate-50 dark:from-[#0a0908] dark:via-[#141210] dark:to-[#0a0908]">

        {/* Decorative background crucifix */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/crucifix.png"
            alt=""
            className="select-none w-[78vw] h-auto lg:w-auto lg:h-[90vh] [mix-blend-mode:multiply] opacity-[0.13] dark:[mix-blend-mode:screen] dark:opacity-[0.07]"
          />
        </div>

        {/* Top nav — only when not expanded */}
        <AnimatePresence>
          {!expanded && (
            <motion.nav
              key="top-nav"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: OUT } }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2, ease: IN } }}
              className="fixed top-0 left-0 right-0 z-[55] flex items-center py-2.5 px-4 sm:px-6 glass border-b-0 border-x-0 rounded-none" style={{ borderBottom: '1px solid var(--glass-border)' }}
            >
              {/* Left — hamburger (mobile) / language selector (desktop) */}
              <div className="flex items-center gap-1">
                {/* Hamburger — mobile only */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2722] transition-colors"
                  aria-label="Open menu"
                >
                  <span className="w-5 h-0.5 bg-slate-600 dark:bg-[#d8cfc0] rounded-full" />
                  <span className="w-5 h-0.5 bg-slate-600 dark:bg-[#d8cfc0] rounded-full" />
                  <span className="w-5 h-0.5 bg-slate-600 dark:bg-[#d8cfc0] rounded-full" />
                </button>
                {/* Language selector — dropdown (all screen sizes) */}
                <div className="relative" ref={langDropdownRef}>
                  <button
                    onClick={() => setLangDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#2c2722] bg-white dark:bg-[#1e1a16] text-xs font-semibold text-slate-700 dark:text-[#d8cfc0] hover:border-amber-300 dark:hover:border-[#cbb994]/60 hover:bg-amber-50 dark:hover:bg-[#2c2722] transition-colors shadow-sm"
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
                          className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-[#1e1a16] border border-slate-200 dark:border-[#2c2722] rounded-xl shadow-lg overflow-hidden min-w-[140px]"
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
              </div>

              {/* Centre — nav links (desktop only) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-0.5"
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
                    className={`relative px-3 py-1.5 rounded-full text-sm font-semibold transition-colors duration-100 ${
                      accent
                        ? "text-amber-600 dark:text-[#cbb994]"
                        : hoveredNav === href
                          ? "text-amber-700 dark:text-[#f5efe3]"
                          : "text-slate-600 dark:text-[#9d9484]"
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
                      <button className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-[#d8cfc0] hover:bg-slate-100 dark:hover:bg-[#2c2722] border border-slate-200 dark:border-[#2c2722] transition-colors">
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 dark:bg-[#cbb994] hover:bg-amber-600 dark:hover:bg-[#e3d2ad] text-white dark:text-[#1c1813] text-xs font-bold shadow-sm transition-colors">
                        ✦ Get Pro
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
              className="fixed top-6 left-6 z-[60] flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold shadow-lg hover:bg-amber-600 transition-colors"
            >
              <span className="text-base leading-none">←</span>
              Back
            </motion.button>
          )}
        </AnimatePresence>

        {/* Two-column layout */}
        <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">

          {/* ----------------------------------------------------------------
              LEFT — Hero content
          ---------------------------------------------------------------- */}
          <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-12 xl:px-20 2xl:px-32 pt-24 pb-10 lg:py-16 w-full lg:w-[55%]">
            <AnimatePresence>
              {!expanded && (
                <>
                  {/* Logo */}
                  <motion.div
                    key="wordmark"
                    variants={heroWordmarkVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="mb-6 lg:mb-12"
                  >
                    <Image
                      src="/apologist.png"
                      alt="Apologist AI"
                      width={220}
                      height={80}
                      priority
                      className="h-48 w-auto dark:brightness-0 dark:invert"
                    />
                  </motion.div>

                  {/* Headline */}
                  <motion.h1
                    key="headline"
                    variants={heroHeadlineVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black text-slate-900 dark:text-[#f5efe3] leading-[1.08] tracking-tight mb-5"
                  >
                    {t(lang, "heroLine1")}
                    <br />
                    <span className="text-amber-500 dark:text-[#cbb994]">{t(lang, "heroLine2")}</span>
                  </motion.h1>

                  {/* Sub-text */}
                  <motion.p
                    key="subtext"
                    variants={heroSubtextVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="text-slate-500 dark:text-[#9d9484] text-base xl:text-lg leading-relaxed max-w-md xl:max-w-xl mb-6"
                  >
                    {t(lang, "heroSub")}
                  </motion.p>

                  {/* Try Now CTA */}
                  <motion.div
                    key="try-now-cta"
                    variants={heroSubtextVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="mb-9"
                  >
                    <motion.button
                      onClick={() => { if (isSignedIn) { router.push("/chat"); } else { setChatKey(k => k + 1); setExpanded(true); } }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 dark:bg-[#cbb994] dark:hover:bg-[#e3d2ad] text-white dark:text-[#1c1813] font-bold text-sm shadow-lg shadow-amber-200 dark:shadow-black/40 transition-colors"
                    >
                      <span>✝</span>
                      {t(lang, "tryItNow")}
                    </motion.button>
                  </motion.div>

                  {/* Bullets */}
                  <div key="bullets" className="mb-8">
                    <HeroBullets lang={lang} />
                  </div>

                  {/* App store badges */}
                  <motion.div
                    key="badges"
                    variants={heroBadgesVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="mb-10"
                  >
                    <AppStoreBadges lang={lang} />
                  </motion.div>

                  {/* Daily Bible verse */}
                  <motion.blockquote
                    key="verse"
                    variants={heroVerseVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="border-l-2 border-amber-300 dark:border-[#cbb994]/40 pl-4 max-w-sm"
                  >
                    <p className="text-[10px] text-amber-500 dark:text-[#cbb994] font-semibold uppercase tracking-widest mb-1.5">
                      {t(lang, "verseOfDay")}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-[#9d9484] italic leading-relaxed">
                      &ldquo;{dailyVerse.text}&rdquo;
                    </p>
                    <footer className="mt-1.5 text-[11px] text-amber-500 dark:text-[#cbb994] font-semibold">
                      — {dailyVerse.ref}
                    </footer>
                  </motion.blockquote>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* ----------------------------------------------------------------
              RIGHT — Chat card
          ---------------------------------------------------------------- */}
          <div className="flex flex-col items-center justify-center py-8 px-6 lg:py-16 lg:pr-8 xl:pr-16 2xl:pr-24 w-full lg:w-[45%]">
            {/* "Try it now" label */}
            <AnimatePresence>
              {!expanded && (
                <motion.div
                  key="try-label"
                  variants={tryLabelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mb-4 flex items-center gap-2"
                >
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                    className="text-amber-500 text-base leading-none"
                  >
                    ✦
                  </motion.span>
                  <span className="text-sm font-semibold text-amber-500 tracking-wide">
                    {t(lang, "tryItNow")}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ----------------------------------------------------------------
                THE CARD — uses `layout` for the expand/collapse animation
            ---------------------------------------------------------------- */}
            <motion.div
              layout
              layoutId="chat-card"
              transition={{
                layout: { type: "spring", stiffness: 260, damping: 30 },
              }}
              className={
                expanded
                  ? "fixed inset-0 z-50 overflow-hidden"
                  : "relative w-full max-w-[420px] xl:max-w-[480px] 2xl:max-w-[520px] h-[500px] sm:h-[540px] lg:h-[580px] xl:h-[640px] 2xl:h-[700px] rounded-2xl overflow-hidden bg-white dark:bg-[#141210] shadow-[0_20px_60px_rgba(0,0,0,0.10)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-[#2c2722]"
              }
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {!expanded ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.3 } }}
                    exit={{ opacity: 0, transition: { duration: 0.18 } }}
                    className="absolute inset-0"
                  >
                    <ChatPreview lang={lang} onExpand={() => { if (isSignedIn) { router.push("/chat"); } else { setChatKey(k => k + 1); setExpanded(true); } }} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.35, delay: 0.15 } }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    className="absolute inset-0 bg-slate-100 dark:bg-[#0a0908] flex justify-center"
                  >
                    <div className="w-full max-w-2xl h-full bg-white dark:bg-[#141210] shadow-2xl">
                      <ChatInterface key={chatKey} initialQuestion={pendingQuestion} startFresh={true} lang={lang} isPro={isPro} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

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

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:divide-x sm:divide-slate-200 sm:dark:divide-[#2c2722]"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.12 } },
              }}
            >
              {(["1", "2", "3"] as const).map((n, i) => (
                <motion.div
                  key={n}
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
                  }}
                  className="relative group overflow-hidden px-0 sm:px-8 first:pl-0 last:pr-0 py-8 sm:py-2 border-t-2 border-amber-500 sm:border-t-0 sm:border-l-0 first:border-t-2 sm:[&:not(:first-child)]:border-t-0"
                >
                  {/* Large faded ordinal */}
                  <span
                    aria-hidden
                    className="absolute -top-3 right-1 sm:right-3 text-[72px] font-black leading-none select-none pointer-events-none
                               text-amber-100 dark:text-[#2c2722] group-hover:text-amber-200 dark:group-hover:text-[#1e1a16] transition-colors duration-500"
                  >
                    0{i + 1}
                  </span>

                  {/* Amber top rule (desktop) */}
                  <div className="hidden sm:block w-8 h-0.5 bg-amber-500 mb-5" />

                  {/* Icon */}
                  <span className="block text-xl mb-3 sm:mb-4">
                    {t(lang, `feature${n}Icon` as Parameters<typeof t>[1])}
                  </span>

                  {/* Title */}
                  <h3 className="text-base font-black text-slate-900 dark:text-[#f5efe3] mb-2 leading-tight tracking-tight">
                    {t(lang, `feature${n}Title` as Parameters<typeof t>[1])}
                  </h3>

                  {/* Body */}
                  <p className="text-sm text-slate-500 dark:text-[#9d9484] leading-relaxed">
                    {t(lang, `feature${n}Body` as Parameters<typeof t>[1])}
                  </p>
                </motion.div>
              ))}
            </motion.div>
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
                  const ok = i < 3;
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
                <div className="flex items-end gap-1">
                  <p className="text-3xl font-black text-slate-900 dark:text-[#f5efe3]">£7</p>
                  <p className="text-sm text-slate-400 dark:text-[#9d9484] mb-1">{t(lang, "pricingProMonth")}</p>
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
        </div>
      </section>

    </LayoutGroup>
  );
}

