"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Conversation } from "@/lib/types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onDelete: (id: string) => void;
  isPro: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function groupByDate(convs: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = Date.now();
  const DAY = 86_400_000;
  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "Older", items: [] },
  ];
  for (const c of convs) {
    const age = now - c.updatedAt;
    if (age < DAY) groups[0].items.push(c);
    else if (age < 2 * DAY) groups[1].items.push(c);
    else if (age < 7 * DAY) groups[2].items.push(c);
    else groups[3].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

export default function ConversationSidebar({
  conversations, activeId, onNew, onDelete, isPro, collapsed, onToggleCollapse,
}: Props) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const grouped = groupByDate(conversations);

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

  return (
    <aside className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-full overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {collapsed ? (
          /* ── Collapsed: icon strip ── */
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-3 pt-5 pb-4 h-full"
          >
            <a href="/" title="Apologist AI" className="text-amber-500 font-black text-xl leading-none mb-1">✝</a>

            <motion.button
              onClick={onToggleCollapse}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Expand sidebar"
              className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRightIcon />
            </motion.button>

            <motion.button
              onClick={onNew}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              title="New conversation"
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-sm"
            >
              <PlusIcon />
            </motion.button>
          </motion.div>
        ) : (
          /* ── Expanded: full sidebar ── */
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="px-4 pt-5 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <a href="/" className="flex items-center gap-2 group">
                  <span className="text-amber-500 font-black text-lg leading-none">✝</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
                    Apologist AI
                  </span>
                </a>
                <motion.button
                  onClick={onToggleCollapse}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Collapse sidebar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeftIcon />
                </motion.button>
              </div>
              <motion.button
                onClick={onNew}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <PlusIcon />
                New conversation
              </motion.button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
              {grouped.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 px-2 py-4 text-center">
                  No conversations yet.<br />Start chatting!
                </p>
              )}
              {grouped.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-1">
                    {group.label}
                  </p>
                  <AnimatePresence initial={false}>
                    {group.items.map((conv) => (
                      <motion.button
                        key={conv.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8, height: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => router.push(`/chat/${conv.id}`)}
                        onMouseEnter={() => setHoveredId(conv.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`w-full flex items-center justify-between gap-1 px-2 py-2 rounded-lg text-left text-xs transition-colors group ${
                          activeId === conv.id
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-l-2 border-amber-500 pl-[calc(0.5rem-2px)]"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="truncate flex-1">{conv.title}</span>
                        {hoveredId === conv.id && (
                          <button
                            onClick={(e) => handleDelete(e, conv.id)}
                            disabled={deletingId === conv.id}
                            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete"
                          >
                            {deletingId === conv.id ? (
                              <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin block" />
                            ) : (
                              <TrashIcon />
                            )}
                          </button>
                        )}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
              {isPro ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                  ✦ Pro
                </span>
              ) : (
                <a
                  href="/#pricing"
                  className="text-[10px] text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  ✦ Upgrade to Pro
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
