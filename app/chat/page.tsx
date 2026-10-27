import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listConversations } from "@/lib/conversations";
import ChatPage from "@/components/ChatPage";

interface Props {
  // ?q= carries a question picked on the homepage, to be asked on arrival.
  searchParams: Promise<{ q?: string }>;
}

export default async function ChatRoute({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [conversations, { q }] = await Promise.all([listConversations(userId), searchParams]);
  const initialQuestion = q?.trim().slice(0, 500) || undefined;

  return <ChatPage initialConversations={conversations} activeConversation={null} initialQuestion={initialQuestion} />;
}
