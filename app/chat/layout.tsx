import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat — Apologist AI",
  description: "Christian apologetics AI assistant.",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
