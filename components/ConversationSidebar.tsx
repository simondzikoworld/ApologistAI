"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, UserButton } from "@clerk/nextjs";
import AnimatedThemeToggler from "./AnimatedThemeToggler";
import { t, type Lang } from "@/lib/i18n";
import type { Conversation } from "@/lib/types";

const LANGS: Lang[] = ["EN", "PL", "ES", "FR", "DE", "PT"];

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onDelete: (id: string) => void;
  isPro: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  /** Called after any navigation, so the mobile drawer can close itself. */
  onNavigate?: () => void;
  /** Hides the collapse button (the mobile drawer has no collapsed state). */
  canCollapse?: boolean;
}

export default function ConversationSidebar({
  conversations, activeId, onNew, onDelete, isPro, collapsed, onToggleCollapse,
  lang, onLangChange, onNavigate, canCollapse = true,
}: Props) {
  const router = useRouter();
  const { user } = useUser();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const navItems = [
    { href: "/#daily-reading", label: t(lang, "navDailyReading"), icon: <BookIcon /> },
    { href: "/#common-questions", label: t(lang, "navCommonQuestions"), icon: <QuestionIcon /> },
    { href: "/#mission", label: t(lang, "navMission"), icon: <CrossIcon /> },
  ];

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  const isChatActive = activeId === null;

  return (
    <aside className="flex flex-col h-full w-full overflow-hidden bg-[var(--sidebar-bg)] border-r border-[var(--border)]">
      {/* ── Brand ── */}
      <div className={`flex items-center h-16 shrink-0 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        {!collapsed && (
          <a href="/" className="flex items-center gap-2.5 min-w-0 group">
            <BrandMark />
            <span className="font-serif text-[1.35rem] font-semibold tracking-tight text-[var(--text-primary)] truncate">
              Apologist AI
            </span>
          </a>
        )}
        {canCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            <PanelIcon flipped={collapsed} />
          </button>
        )}
      </div>

      {/* ── Main nav ── */}
      <nav className={`shrink-0 ${collapsed ? "px-2" : "px-3"}`}>
        {!collapsed && <SectionLabel>{t(lang, "sidebarMain")}</SectionLabel>}
        <div className="space-y-0.5">
          <NavRow
            collapsed={collapsed}
            active={isChatActive}
            icon={<ChatIcon />}
            label={t(lang, "newChat")}
            onClick={() => { onNew(); onNavigate?.(); }}
          />
          {navItems.map((item) => (
            <NavRow key={item.href} collapsed={collapsed} icon={item.icon} label={item.label} href={item.href} />
          ))}
        </div>
      </nav>

      {/* ── Recent conversations ── */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-thin mt-6 short:mt-4">
        {!collapsed && (
          <div className="px-3 pb-3">
            <SectionLabel>{t(lang, "sidebarRecent")}</SectionLabel>
            {conversations.length === 0 ? (
              <p className="font-serif italic text-sm text-[var(--text-muted)] text-center py-6">
                {t(lang, "noConversations")}
              </p>
            ) : (
              <div className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {conversations.map((conv) => (
                    <motion.div
                      key={conv.id}
                      layout
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="group relative"
                    >
                      <button
                        onClick={() => { router.push(`/chat/${conv.id}`); onNavigate?.(); }}
                        className={`w-full text-left pl-3 pr-9 py-2 rounded-lg text-sm truncate transition-colors ${
                          activeId === conv.id
                            ? "bg-[var(--active-bg)] text-[var(--text-primary)]"
                            : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[var(--hover-bg)]"
                        }`}
                      >
                        {conv.title}
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, conv.id)}
                        disabled={deletingId === conv.id}
                        title="Delete"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-red-500 dark:hover:text-[#f0726a] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        {deletingId === conv.id ? (
                          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin block" />
                        ) : (
                          <TrashIcon />
                        )}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer: plan, account, language, theme ── */}
      <div className={`shrink-0 border-t border-[var(--border)] ${collapsed ? "px-2 py-3" : "px-3 py-3"} space-y-3`}>
        {!isPro && !collapsed && (
          <a
            href="/#pricing"
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 dark:bg-[#cbb994] dark:hover:bg-[#e3d2ad] text-white dark:text-[#1c1813] text-sm font-medium transition-colors"
          >
            ✦ {t(lang, "upgradePro")}
          </a>
        )}

        <div className={`flex items-center ${collapsed ? "flex-col gap-3" : "gap-2"}`}>
          <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "" : "flex-1"}`}>
            <UserButton />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm text-[var(--text-body)] truncate leading-tight">
                  {user?.firstName ?? user?.username ?? "Account"}
                </p>
                <p className={`text-[11px] leading-tight ${isPro ? "text-amber-600 dark:text-[#cbb994]" : "text-[var(--text-muted)]"}`}>
                  {isPro ? "✦ Pro" : "Free"}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <select
              value={lang}
              onChange={(e) => onLangChange(e.target.value as Lang)}
              aria-label="Language"
              className="text-base sm:text-xs rounded-lg px-1.5 py-1 bg-transparent border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-body)] focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-[#cbb994]/60 cursor-pointer"
            >
              {LANGS.map((l) => (
                <option key={l} value={l} className="bg-[var(--surface)]">{l}</option>
              ))}
            </select>
          )}
          <AnimatedThemeToggler />
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
      {children}
    </p>
  );
}

function NavRow({
  collapsed, active = false, icon, label, href, onClick,
}: {
  collapsed: boolean;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className = `flex items-center gap-3 w-full rounded-xl text-[15px] transition-colors ${
    collapsed ? "justify-center p-2.5 short:p-2" : "px-3 py-2.5 short:py-2"
  } ${
    active
      ? "bg-[var(--active-bg)] text-[var(--text-primary)]"
      : "text-[var(--text-body)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
  }`;
  const content = (
    <>
      <span className={`shrink-0 ${active ? "text-amber-600 dark:text-[#cbb994]" : "text-[var(--text-muted)]"}`}>{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );
  return href ? (
    <a href={href} title={collapsed ? label : undefined} className={className}>{content}</a>
  ) : (
    <button onClick={onClick} title={collapsed ? label : undefined} className={className}>{content}</button>
  );
}

function BrandMark() {
  return (
    <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-amber-100 dark:bg-[#2b2519] text-amber-600 dark:text-[#e3d2ad] text-base leading-none shadow-[0_0_18px_var(--glow-soft)]">
      ✝
    </span>
  );
}

/* Thin line icons, matching the design system's "clean thin line icons in a neutral tone". */
const iconProps = {
  className: "w-[18px] h-[18px]",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

function ChatIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-5 3.5V5.5Z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 6.5C10.5 5.3 8.5 4.75 6 4.75c-1 0-2 .1-3 .35v13.5c1-.25 2-.35 3-.35 2.5 0 4.5.55 6 1.75m0-13.5c1.5-1.2 3.5-1.75 6-1.75 1 0 2 .1 3 .35v13.5c-1-.25-2-.35-3-.35-2.5 0-4.5.55-6 1.75m0-13.5V20" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.75 9.5a2.35 2.35 0 0 1 4.5.9c0 1.6-2.25 2-2.25 3.35M12 16.75h.01" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3.5v17M7 8.5h10" />
    </svg>
  );
}

function PanelIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg {...iconProps}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9 4.5v15" />
      <path d={flipped ? "M13 10l2 2-2 2" : "M15.5 10l-2 2 2 2"} />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}
