import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listConversations, getConversation } from "@/lib/conversations";
import ChatPage from "@/components/ChatPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ChatConversationRoute({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const [conversations, conversation] = await Promise.all([
    listConversations(userId),
    getConversation(id),
  ]);

  // If the conversation doesn't exist or belongs to someone else, go to /chat
  if (!conversation || conversation.userId !== userId) redirect("/chat");

  return <ChatPage initialConversations={conversations} activeConversation={conversation} />;
}
