"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import AnimatedThemeToggler from "./AnimatedThemeToggler";
import ConversationSidebar from "./ConversationSidebar";
import ChatInterface from "./ChatInterface";
import { t, type Lang } from "@/lib/i18n";
import type { Conversation, Message } from "@/lib/types";

const LANGS: Lang[] = ["EN", "PL", "ES", "FR", "DE"];
const LOCAL_HISTORY_KEY = "cd-chat-history";
const MIGRATED_KEY = "cd-history-migrated";

interface Props {
  initialConversations: Conversation[];
  activeConversation?: Conversation | null;
}

export default function ChatPage({ initialConversations, activeConversation }: Props) {
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const isPro = (user?.publicMetadata?.isPro as boolean) ?? false;
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [lang, setLang] = useState<Lang>("EN");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [localActiveId, setLocalActiveId] = useState<string | null>(activeConversation?.id ?? null);

  const activeId = localActiveId;

  // One-time localStorage migration
  useEffect(() => {
    if (!isSignedIn) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(MIGRATED_KEY)) return;

    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (raw) {
      try {
        const messages: Message[] = JSON.parse(raw);
        if (messages.length >= 2) {
          const firstUserMsg = messages.find((m) => m.role === "user")?.content ?? "";
          fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              title: firstUserMsg.trim().replace(/[?!.]+$/, "").slice(0, 60) || "Imported conversation",
              messages: messages.slice(-40),
              mode: "simple",
              lang: "EN",
              createdAt: Date.now(),
            }),
          }).catch(() => {});
        }
      } catch {}
    }
    localStorage.setItem(MIGRATED_KEY, "1");
  }, [isSignedIn]);

  const handleConversationSaved = useCallback((id: string) => {
    // Refresh conversation list from server so sidebar updates
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data: Conversation[]) => setConversations(data))
      .catch(() => {});

    // Update URL without triggering Next.js navigation (preserves ChatInterface state)
    if (!localActiveId) {
      setLocalActiveId(id);
      window.history.replaceState(null, "", `/chat/${id}`);
    }
  }, [localActiveId]);

  function handleNew() {
    setChatKey((k) => k + 1);
    router.push("/chat");
    setSidebarOpen(false);
  }

  function handleDelete(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) router.push("/chat");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on desktop, slide-in on mobile */}
      <div className={`fixed inset-y-0 left-0 z-30 lg:static lg:z-auto transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          onNew={handleNew}
          onDelete={handleDelete}
          isPro={isPro}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <HamburgerIcon />
            </button>
            <a href="/" className="hidden lg:flex items-center gap-1.5 text-sm text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
              <ArrowLeftIcon />
              {t(lang, "navHome")}
            </a>
          </div>

          <div className="flex items-center gap-2">
            {/* Language selector */}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <AnimatedThemeToggler />

            <div className="relative">
              <UserButton />
              {isPro && (
                <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-amber-500 text-white px-1 py-px rounded-full leading-none pointer-events-none select-none">
                  PRO
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            key={chatKey}
            startFresh={!activeConversation}
            initialQuestion={undefined}
            lang={lang}
            isPro={isPro}
            conversationId={activeConversation?.id}
            onConversationSaved={handleConversationSaved}
          />
        </div>
      </div>
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
