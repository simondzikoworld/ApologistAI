import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { PRIVACY_POLICY } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy — Apologist AI",
  description: "How Apologist AI collects, uses and protects your personal data, and your rights.",
};

export default function PrivacyPage() {
  return <LegalPage markdown={PRIVACY_POLICY} />;
}
