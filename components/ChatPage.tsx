"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useIsPro } from "@/lib/useIsPro";
import { motion } from "framer-motion";
import ConversationSidebar from "./ConversationSidebar";
import ChatInterface from "./ChatInterface";
import type { Lang } from "@/lib/i18n";
import type { Conversation, Message } from "@/lib/types";

const LOCAL_HISTORY_KEY = "cd-chat-history";
const MIGRATED_KEY = "cd-history-migrated";

interface Props {
  initialConversations: Conversation[];
  activeConversation?: Conversation | null;
}

export default function ChatPage({ initialConversations, activeConversation }: Props) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const isPro = useIsPro();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "EN";
    return (localStorage.getItem("cd-lang") as Lang) ?? "EN";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data: Conversation[]) => setConversations(data))
      .catch(() => {});

    if (!localActiveId) {
      setLocalActiveId(id);
      window.history.replaceState(null, "", `/chat/${id}`);
    }
  }, [localActiveId]);

  function handleNew() {
    setChatKey((k) => k + 1);
    setLocalActiveId(null);
    router.push("/chat");
    setSidebarOpen(false);
  }

  function handleDelete(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setLocalActiveId(null);
      router.push("/chat");
    }
  }

  function handleLangChange(l: Lang) {
    setLang(l);
    localStorage.setItem("cd-lang", l);
  }

  const sidebarProps = {
    conversations,
    activeId,
    onNew: handleNew,
    onDelete: handleDelete,
    isPro,
    lang,
    onLangChange: handleLangChange,
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--page-bg)]">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar — animated width */}
      <motion.div
        animate={{ width: sidebarCollapsed ? 68 : 280 }}
        initial={false}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
        className="hidden lg:block h-full shrink-0 overflow-hidden"
      >
        <ConversationSidebar
          {...sidebarProps}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      </motion.div>

      {/* Mobile sidebar — fixed overlay */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-[280px] max-w-[85vw] lg:hidden transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ConversationSidebar
          {...sidebarProps}
          collapsed={false}
          canCollapse={false}
          onToggleCollapse={() => {}}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main area */}
      <main className="relative flex flex-col flex-1 min-w-0">
        {/* Mobile menu button — the sidebar carries everything else */}
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="lg:hidden absolute top-3 left-3 z-10 p-2 rounded-xl glass text-[var(--text-body)]"
        >
          <HamburgerIcon />
        </button>

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
      </main>
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

