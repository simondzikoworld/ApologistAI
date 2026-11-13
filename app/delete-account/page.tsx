import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import DeleteAccountPanel from "@/components/DeleteAccountPanel";
import { CONTACT_EMAIL } from "@/lib/legal/details";

export const metadata: Metadata = {
  title: "Delete your account — Apologist AI",
  description: "How to delete your Apologist AI account and the data that is removed.",
};

// Google Play requires a web page where users can request account deletion
// without the app. This is that page (link it in Play Console → Data safety).
const INFO = `# Delete your Apologist AI account

You can delete your account at any time — in the app (**Menu → your account → Delete account**) or right here.

**What is deleted, permanently:**
- your account and sign-in details
- all your saved conversations
- your usage records and Pro status

**Before you delete — subscriptions:**
- A subscription bought on **this website** is cancelled automatically.
- A subscription bought in the **Android app** is billed by Google and **must be cancelled in Google Play**: Play Store → Payments & subscriptions → Subscriptions → Apologist AI. Deleting your account does not stop Google from billing you.

**What is kept:** payment records that Google Play and Stripe must keep by law (for tax purposes). AI providers may briefly keep the text of questions under their own policies — see our [Privacy Policy](/privacy).

Deletion happens immediately. If you cannot sign in, email **${CONTACT_EMAIL}** from the address on your account and we will delete it within 30 days.`;

export default function DeleteAccountPage() {
  return (
    <LegalPage markdown={INFO}>
      <DeleteAccountPanel contactEmail={CONTACT_EMAIL} />
    </LegalPage>
  );
}
