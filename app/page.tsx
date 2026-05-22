"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup, type Variants } from "framer-motion";
import ChatInterface from "@/components/ChatInterface";
import ChatPreview from "@/components/ChatPreview";
import AnimatedThemeToggler from "@/components/AnimatedThemeToggler";
import { t, tArr, type Lang } from "@/lib/i18n";

type EaseOut = "easeOut";
type EaseIn = "easeIn";
const OUT: EaseOut = "easeOut";
const IN: EaseIn = "easeIn";

// ---------------------------------------------------------------------------
// Daily verse rotation
// ---------------------------------------------------------------------------

const DAILY_VERSES = [
  { text: "But in your hearts revere Christ as Lord. Always be prepared to give an answer to everyone who asks you to give the reason for the hope that you have.", ref: "1 Peter 3:15" },
  { text: "For the word of God is alive and active. Sharper than any double-edged sword.", ref: "Hebrews 4:12" },
  { text: "Jesus answered, 'I am the way and the truth and the life. No one comes to the Father except through me.'", ref: "John 14:6" },
  { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", ref: "John 3:16" },
  { text: "The fool says in his heart, 'There is no God.'", ref: "Psalm 14:1" },
  { text: "All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness.", ref: "2 Timothy 3:16" },
  { text: "In the beginning was the Word, and the Word was with God, and the Word was God.", ref: "John 1:1" },
  { text: "For I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes.", ref: "Romans 1:16" },
  { text: "We demolish arguments and every pretension that sets itself up against the knowledge of God.", ref: "2 Corinthians 10:5" },
  { text: "For there is one God and one mediator between God and mankind, the man Christ Jesus.", ref: "1 Timothy 2:5" },
  { text: "But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.", ref: "Romans 5:8" },
  { text: "I have been crucified with Christ and I no longer live, but Christ lives in me.", ref: "Galatians 2:20" },
  { text: "Jesus Christ is the same yesterday and today and forever.", ref: "Hebrews 13:8" },
  { text: "The heavens declare the glory of God; the skies proclaim the work of his hands.", ref: "Psalm 19:1" },
  { text: "He is not here; he has risen, just as he said.", ref: "Matthew 28:6" },
  { text: "For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.", ref: "Romans 6:23" },
  { text: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" },
  { text: "Come now, let us reason together, says the Lord.", ref: "Isaiah 1:18" },
  { text: "And you will know the truth, and the truth will set you free.", ref: "John 8:32" },
  { text: "If you confess with your mouth that Jesus is Lord and believe in your heart that God raised him from the dead, you will be saved.", ref: "Romans 10:9" },
  { text: "For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the power of God.", ref: "1 Corinthians 1:18" },
  { text: "Do not be conformed to this world, but be transformed by the renewal of your mind.", ref: "Romans 12:2" },
  { text: "The Lord is not slow in keeping his promise, as some understand slowness. Instead he is patient with you, not wanting anyone to perish.", ref: "2 Peter 3:9" },
  { text: "Jesus said to her, 'I am the resurrection and the life. The one who believes in me will live, even though they die.'", ref: "John 11:25" },
  { text: "For we live by faith, not by sight.", ref: "2 Corinthians 5:7" },
  { text: "Now faith is confidence in what we hope for and assurance about what we do not see.", ref: "Hebrews 11:1" },
  { text: "For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God.", ref: "Ephesians 2:8" },
  { text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you.", ref: "Zephaniah 3:17" },
  { text: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.", ref: "Matthew 7:7" },
  { text: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.", ref: "2 Timothy 1:7" },
];

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
          <span className="text-sm text-slate-600 dark:text-slate-400 leading-snug">{b}</span>
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
  const [expanded, setExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>();
  const [chatKey, setChatKey] = useState(0);
  const [lang, setLang] = useState<Lang>("EN");
  const [readings, setReadings] = useState<{ date: string; readings: Array<{ title: string; reference: string; subtitle: string; text: string }> } | null>(null);
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [readingsError, setReadingsError] = useState(false);
  const [expandedReading, setExpandedReading] = useState<number | null>(null);

  // Lock page scroll when chat is fullscreen; clear pending question when chat closes
  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    if (!expanded) setPendingQuestion(undefined);
    return () => { document.body.style.overflow = ""; };
  }, [expanded]);

  const dailyVerse = useMemo(
    () => DAILY_VERSES[getDayOfYear() % DAILY_VERSES.length],
    []
  );

  useEffect(() => {
    fetch("/api/daily-reading")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReadings(data);
        setExpandedReading(0); // auto-open first reading
      })
      .catch(() => setReadingsError(true))
      .finally(() => setReadingsLoading(false));
  }, []);

  function openWithQuestion(q: string) {
    setChatKey(k => k + 1);
    setPendingQuestion(q);
    setExpanded(true);
  }

  return (
    <LayoutGroup>
      {/* Full-viewport background */}
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-amber-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-800/20 dark:to-slate-900">

        {/* Decorative background crucifix */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/crucifix.png"
            alt=""
            className="select-none w-[78vw] h-auto lg:w-auto lg:h-[90vh]"
            style={{ opacity: 0.13, mixBlendMode: "multiply" }}
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
              className="fixed top-0 left-0 right-0 z-[55] flex items-center py-2.5 px-4 sm:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700"
            >
              {/* Left — hamburger (mobile) / language selector (desktop) */}
              <div className="flex items-center gap-1">
                {/* Hamburger — mobile only */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Open menu"
                >
                  <span className="w-5 h-0.5 bg-slate-600 dark:bg-slate-300 rounded-full" />
                  <span className="w-5 h-0.5 bg-slate-600 dark:bg-slate-300 rounded-full" />
                  <span className="w-5 h-0.5 bg-slate-600 dark:bg-slate-300 rounded-full" />
                </button>
                {/* Language selector — desktop only */}
                {(["EN", "PL"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`hidden md:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                      lang === l
                        ? "bg-amber-500 text-white"
                        : "text-slate-500 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-slate-800 hover:text-amber-700"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Centre — nav links (desktop only) */}
              <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1">
                {[
                  { href: "#", label: t(lang, "navHome") },
                  { href: "#mission", label: t(lang, "navMission") },
                  { href: "#common-questions", label: t(lang, "navCommonQuestions") },
                  { href: "#daily-reading", label: t(lang, "navDailyReading") },
                ].map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-100 dark:hover:bg-slate-800 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>

              {/* Right — dark mode toggle */}
              <div className="ml-auto">
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
                className="fixed top-0 left-0 h-full w-72 z-[80] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
              >
                {/* Sidebar header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 text-lg">✝</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">Apologist AI</span>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-lg leading-none"
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
                      className="px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-slate-800 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                    >
                      {label}
                    </a>
                  ))}
                </nav>

                {/* Divider */}
                <div className="mx-5 border-t border-slate-100 dark:border-slate-800" />

                {/* Language selector */}
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Language</p>
                  <div className="flex gap-2">
                    {(["EN", "PL"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLang(l); setSidebarOpen(false); }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          lang === l
                            ? "bg-amber-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-700"
                        }`}
                      >
                        {l === "EN" ? "🇬🇧 English" : "🇵🇱 Polski"}
                      </button>
                    ))}
                  </div>
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
          <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-12 xl:px-20 pt-24 pb-10 lg:py-16 w-full lg:w-[55%]">
            <AnimatePresence>
              {!expanded && (
                <>
                  {/* Wordmark */}
                  <motion.div
                    key="wordmark"
                    variants={heroWordmarkVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex items-center gap-2 mb-6 lg:mb-12"
                  >
                    <span className="text-amber-600 text-lg leading-none">✝</span>
                    <span className="text-sm font-semibold text-slate-500 tracking-wide">
                      Apologist AI
                    </span>
                  </motion.div>

                  {/* Headline */}
                  <motion.h1
                    key="headline"
                    variants={heroHeadlineVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-[1.08] tracking-tight mb-5"
                  >
                    {t(lang, "heroLine1")}
                    <br />
                    <span className="text-amber-500">{t(lang, "heroLine2")}</span>
                  </motion.h1>

                  {/* Sub-text */}
                  <motion.p
                    key="subtext"
                    variants={heroSubtextVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="text-slate-500 dark:text-slate-400 text-base leading-relaxed max-w-md mb-6"
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
                      onClick={() => { setChatKey(k => k + 1); setExpanded(true); }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-200 dark:shadow-amber-900/40 transition-colors"
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
                    className="border-l-2 border-amber-300 pl-4 max-w-sm"
                  >
                    <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-widest mb-1.5">
                      {t(lang, "verseOfDay")}
                    </p>
                    <p className="text-xs text-slate-400 italic leading-relaxed">
                      &ldquo;{dailyVerse.text}&rdquo;
                    </p>
                    <footer className="mt-1.5 text-[11px] text-amber-500 font-semibold">
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
          <div className="flex flex-col items-center justify-center py-8 px-6 lg:py-16 lg:pr-4 xl:pr-8 w-full lg:w-[45%]">
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
                  ? "fixed inset-0 z-50 overflow-hidden bg-white dark:bg-slate-900"
                  : "relative w-full max-w-[420px] h-[500px] sm:h-[540px] lg:h-[580px] rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.10)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-800"
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
                    <ChatPreview lang={lang} onExpand={() => { setChatKey(k => k + 1); setExpanded(true); }} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.35, delay: 0.15 } }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    className="absolute inset-0"
                  >
                    <ChatInterface key={chatKey} initialQuestion={pendingQuestion} startFresh={true} lang={lang} />
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
      <section id="mission" className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 sm:px-10 lg:px-12 xl:px-20 py-12 lg:py-20">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-amber-500 text-2xl">✝</span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t(lang, "aboutTitle")}</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 text-base">
              {t(lang, "aboutP1")}
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8 text-base">
              {t(lang, "aboutP2")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
              {(["1", "2", "3"] as const).map((n) => (
                <div key={n} className="bg-amber-50 dark:bg-slate-800 border border-amber-100 dark:border-slate-700 rounded-2xl p-5">
                  <div className="text-2xl mb-3">{t(lang, `feature${n}Icon` as Parameters<typeof t>[1])}</div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{t(lang, `feature${n}Title` as Parameters<typeof t>[1])}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t(lang, `feature${n}Body` as Parameters<typeof t>[1])}</p>
                </div>
              ))}
            </div>
            <blockquote className="mt-12 border-l-4 border-amber-400 pl-6">
              <p className="text-lg italic text-slate-500 dark:text-slate-400 leading-relaxed">
                &ldquo;{t(lang, "aboutQuote")}&rdquo;
              </p>
              <footer className="mt-2 text-sm text-amber-600 font-semibold">{t(lang, "aboutQuoteRef")}</footer>
            </blockquote>
          </div>
      </section>

      {/* ----------------------------------------------------------------
          COMMON QUESTIONS — below Our Mission
      ---------------------------------------------------------------- */}
      <section id="common-questions" className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 sm:px-10 lg:px-12 xl:px-20 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-amber-500 text-2xl">⚔</span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t(lang, "commonQuestionsTitle")}</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">{t(lang, "commonQuestionsSub")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tArr(lang, "objections").map((q) => (
              <button
                key={q}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setTimeout(() => openWithQuestion(q), 300);
                }}
                className="group flex items-start gap-3 text-left px-5 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 text-[10px] font-bold group-hover:bg-amber-200 transition-colors">?</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">{q}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          DAILY READING — below Our Mission
      ---------------------------------------------------------------- */}
      <section id="daily-reading" className="bg-amber-50 dark:bg-slate-800/60 border-t border-amber-100 dark:border-slate-700 px-6 sm:px-10 lg:px-12 xl:px-20 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="text-amber-500 text-2xl">✝</span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t(lang, "dailyReadingTitle")}</h2>
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
                  className="bg-white dark:bg-slate-800 border border-amber-100 dark:border-slate-700 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedReading(expandedReading === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-amber-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-widest text-amber-600 shrink-0">{r.title}</span>
                        {r.reference && (
                          <span className="text-xs text-slate-400">{r.reference}</span>
                        )}
                      </div>
                      {r.subtitle && (
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5 truncate">{r.subtitle}</p>
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
                        <div className="px-5 pb-5 border-t border-amber-100 dark:border-slate-700 pt-4">
                          {r.text.split("\n\n").map((para, j) => (
                            <p key={j} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3 last:mb-0 italic">
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

    </LayoutGroup>
  );
}

