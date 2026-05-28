import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listConversations } from "@/lib/conversations";
import ChatPage from "@/components/ChatPage";

export default async function ChatRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const conversations = await listConversations(userId);

  return <ChatPage initialConversations={conversations} activeConversation={null} />;
}
