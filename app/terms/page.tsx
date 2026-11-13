import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { TERMS_OF_USE } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms of Use — Apologist AI",
  description: "The terms for using Apologist AI, including Pro subscriptions, cancellation and refunds.",
};

export default function TermsPage() {
  return <LegalPage markdown={TERMS_OF_USE} />;
}
