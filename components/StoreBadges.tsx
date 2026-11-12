import { t, type Lang } from "@/lib/i18n";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/site";

// App Store and Google Play badges. Until a store link is set in lib/site.ts,
// that badge is a quiet "coming soon" instead of a link that goes nowhere.
export default function StoreBadges({ lang }: { lang: Lang }) {
  const live = Boolean(APP_STORE_URL || PLAY_STORE_URL);

  return (
    <div className="flex flex-col items-center gap-2.5">
      {!live && (
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">{t(lang, "comingToMobile")}</p>
      )}
      <div className="flex gap-2.5">
        <Badge url={APP_STORE_URL} line={t(lang, "storeAppleLine")} store="App Store" comingSoon={t(lang, "comingSoon")} icon={<AppleIcon />} />
        <Badge url={PLAY_STORE_URL} line={t(lang, "storeGoogleLine")} store="Google Play" comingSoon={t(lang, "comingSoon")} icon={<PlayIcon />} />
      </div>
    </div>
  );
}

function Badge({ url, line, store, comingSoon, icon }: { url: string; line: string; store: string; comingSoon: string; icon: React.ReactNode }) {
  const inner = (
    <>
      <span className="shrink-0">{icon}</span>
      <span className="text-left leading-none">
        <span className="block text-[9px] text-white/70">{url ? line : comingSoon}</span>
        <span className="block mt-0.5 text-[15px] font-medium tracking-tight text-white">{store}</span>
      </span>
    </>
  );
  const base = "flex items-center gap-2.5 h-11 pl-3 pr-4 rounded-xl bg-black border border-white/15 transition-colors";

  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${base} hover:border-[var(--gold)]/60`}>
      {inner}
    </a>
  ) : (
    <div aria-label={`${store}: ${comingSoon}`} className={`${base} opacity-60 cursor-default select-none`}>
      {inner}
    </div>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.73c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.65.8-3.33.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.74 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.18-.02 1.93-1.08 2.66-2.15.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.3-.88-2.31-3.54ZM14.2 6.27c.6-.73 1.01-1.75.9-2.77-.87.04-1.92.58-2.55 1.31-.56.65-1.05 1.69-.92 2.69.97.07 1.96-.49 2.57-1.23Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.6 2.3 13.4 12l-9.8 9.7c-.35-.2-.6-.6-.6-1.1V3.4c0-.5.25-.9.6-1.1Z" fill="#00d7fe" />
      <path d="M16.7 8.7 13.4 12 3.6 2.3c.1-.06.22-.1.35-.1.2 0 .4.05.6.16l12.15 6.34Z" fill="#00f076" />
      <path d="M16.7 15.3 4.55 21.64c-.2.1-.4.16-.6.16-.13 0-.25-.04-.35-.1L13.4 12l3.3 3.3Z" fill="#ff3a44" />
      <path d="M20.4 10.6c.6.32.6 1.15 0 1.47l-3.7 1.93-.03.02L13.4 12l3.3-3.3 3.7 1.9Z" fill="#ffd400" />
    </svg>
  );
}
