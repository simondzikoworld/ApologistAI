import { OPERATOR_NAME, CONTACT_EMAIL, SERVICE_NAME, SITE_URL, LEGAL_LAST_UPDATED, MIN_AGE } from "./details";

// Privacy Policy (UK GDPR). Markdown, rendered by components/LegalPage.tsx.
// Keep it truthful to what the code does — if a data flow changes (new AI
// provider, new analytics, longer retention), update this in the same change.

export const PRIVACY_POLICY = `# Privacy Policy

*Last updated: ${LEGAL_LAST_UPDATED}*

This policy explains what personal data ${SERVICE_NAME} collects, why, who it is shared with, how long it is kept, and your rights. It applies to the ${SERVICE_NAME} website (${SITE_URL}) and the ${SERVICE_NAME} mobile app (together, "the Service").

## 1. Who we are

${SERVICE_NAME} is run by **${OPERATOR_NAME}**, an individual based in the United Kingdom ("we", "us"). We are the **data controller** for the personal data described here.

Contact for anything in this policy: **${CONTACT_EMAIL}**

## 2. The short version

- We collect only what we need to run the Service: your account details, the questions you ask, your saved conversations, and whether you have a Pro subscription.
- Your questions are sent to **AI providers** to generate answers. Some of these providers are located **outside the UK, including in China** (see section 6). **Please do not include names, contact details or other private information about yourself or anyone else in your questions.**
- We do **not** sell your data or use analytics tools. The free Android app offers **optional rewarded ads** — you choose to watch one to earn an extra question. These ads are provided by **Google AdMob** (see section 3). There are no ads on the website and none for Pro subscribers.
- We never see your full card details — payments are handled by **Google Play** and **Stripe**.
- You can **delete your account and data at any time**, in the app or at ${SITE_URL}/delete-account.

## 3. What we collect

**Account information** — if you create an account: your email address, your name (if you give one), and, if you sign in with Google, the name, email and profile picture Google shares with us. Accounts are managed by our authentication provider, Clerk, which also stores a secure identifier for your account.

**Your questions and the answers** — the messages you send and the answers the Service returns. If you are signed in, your conversations are **saved to your account** so you can return to them.

**Usage information** — to apply daily message limits we keep simple counters: per account if you are signed in, or per **IP address** if you are not. We also record when you have used the free Detailed-mode answer available to free accounts.

**Subscription information** — whether you have Pro, and the subscription records our payment partners send us (for example, that a subscription started, renewed or ended). We do **not** receive your full card number or bank details.

**Technical information** — our hosting provider automatically records standard request logs (such as IP address, time, and the page or service requested) for security and to keep the Service running.

**Rewarded ads (Android app, free version)** — if you choose to watch an ad to earn an extra question, we record that you did (per account, or per IP address for guests) so we can apply the daily cap. The ad itself is served by **Google AdMob**, which collects data from your device to show the ad, measure it and prevent fraud — such as your device's **advertising ID**, IP address, approximate location derived from it, and how you interact with the ad. Google acts as an independent controller for this data under its own privacy policy (policies.google.com/privacy). In the UK and EEA, Google shows **personalised ads only if you consent** in the consent message the app displays; otherwise it shows non-personalised ads. You can change your choice at any time in the app's settings, and reset or delete your advertising ID in your Android settings.

**Data stored on your device** — the app stores your language, theme and a few preferences on your device, and keeps your sign-in session in your device's secure storage. This stays on your device.

**Special category data** — questions about faith may reveal your **religious or philosophical beliefs**, which UK law treats as sensitive. We do not ask for your beliefs. If what you choose to write reveals them, we process it only to answer you and, if you are signed in, to keep your conversation history for you (see section 4).

We do **not** knowingly collect anything else: no precise location and no contacts. Apart from the optional rewarded ads described above, we do not use advertising identifiers.

## 4. Why we use it, and our legal basis

| Purpose | Legal basis (UK GDPR) |
|---|---|
| Creating and running your account, answering your questions, saving your conversations | **Contract** — this is the service you asked for (Art. 6(1)(b)) |
| Processing questions that reveal religious beliefs | Your **explicit consent**, given by choosing to write and send them (Art. 9(2)(a)). You can withdraw it at any time by deleting the conversations or your account. |
| Providing Pro and handling subscriptions | **Contract** (Art. 6(1)(b)) |
| Daily limits, preventing abuse, keeping the Service secure | Our **legitimate interests** in a fair, reliable and secure service (Art. 6(1)(f)) |
| Keeping payment and tax records | **Legal obligation** (Art. 6(1)(c)) — held mainly by our payment partners |
| Showing a rewarded ad you choose to watch, and crediting the extra question | **Contract** — the reward you asked for (Art. 6(1)(b)) |
| Personalised ads (UK/EEA) | Your **consent**, given in the in-app consent message and changeable at any time (Art. 6(1)(a)) |

We do not sell your data, we never show ads beside or based on the content of your conversations, and we do not make decisions about you that have legal or similarly significant effects based solely on automated processing.

## 5. Who we share it with

We use the following service providers ("processors") to run the Service. They may only use your data to provide their service to us.

| Provider | What for | Where |
|---|---|---|
| **Clerk** | Accounts and sign-in | USA |
| **Vercel** | Hosting the website and server | USA / global |
| **Upstash** | Storing saved conversations and usage counters | Cloud database |
| **AI providers** (see section 6) | Generating answers to your questions | China, USA |
| **Google Play** and **RevenueCat** | In-app subscriptions on Android | USA |
| **Stripe** | Subscriptions bought on the website | USA / Ireland |
| **Google AdMob** | Optional rewarded ads in the free Android app (independent controller for ad data) | USA / global |

We may also disclose information if required by law, to protect the rights and safety of users or others, or as part of a transfer of the Service to a new owner (who would remain bound by this policy).

## 6. AI providers and international transfers

To answer you, the text of your question (and recent messages in the same conversation) is sent to a large-language-model provider. We currently use **DeepSeek** and/or **Moonshot AI (Kimi)**, which are based in **China**, as our main providers, and **Anthropic** (USA) as a backup and to translate the daily readings. We may change providers; this section will be updated when we do.

Some of these countries are not recognised by the UK as providing an equivalent level of data protection. We send your questions to them because it is **necessary to provide the answers you ask for**, we send only the conversation text needed to answer (not your email or account details), and we ask you not to include personal information in questions. Where a provider offers recognised safeguards (such as the UK International Data Transfer Agreement or Standard Contractual Clauses), we rely on them.

AI providers may keep the text they receive for a period set by their own policies (for example, to detect abuse). **We do not use your conversations to train AI models.** How each provider treats the text it receives is governed by its own terms, which we review when choosing providers.

## 7. How long we keep it

| Data | Kept for |
|---|---|
| Account information | Until you delete your account |
| Saved conversations | Up to **90 days** after the conversation was last updated, or until you delete it or your account |
| Daily usage counters (including guests' IP addresses) | About **25 hours** |
| Free Detailed-answer marker | **3 days** |
| Rewarded-ad counter | About **25 hours** |
| Data collected by Google AdMob | Under Google's own retention policy |
| Subscription status | Until you delete your account |
| Payment records | As required by tax law (held by Google Play / Stripe) |
| Hosting logs | Short periods, typically up to **30 days** |

## 8. Your rights

Under UK data protection law you have the right to:

- **access** the personal data we hold about you;
- **correct** inaccurate data;
- **delete** your data ("right to be forgotten");
- **restrict** or **object** to certain processing;
- **data portability** — receive your data in a reusable format;
- **withdraw consent** at any time, where we rely on it.

To use any of these rights, email **${CONTACT_EMAIL}** from the address on your account. We will reply within **one month**. There is normally no charge.

If you are unhappy with how we handle your data, please contact us first. You also have the right to complain to the UK **Information Commissioner's Office** (ico.org.uk, 0303 123 1113).

## 9. Deleting your account

You can delete your account at any time:

- **In the app:** Menu → your account → **Delete account**
- **On the web:** ${SITE_URL}/delete-account
- **By email:** ${CONTACT_EMAIL}

Deleting your account permanently removes your account, your saved conversations, your usage records and your Pro status. A subscription bought on the website is cancelled automatically. **A subscription bought through Google Play must be cancelled in Google Play** (Play Store → Payments & subscriptions → Subscriptions) — deleting your account does not stop Google from billing you. Payment records that our payment partners must keep by law are not affected.

## 10. Children

The Service is intended for people aged **${MIN_AGE} and over**. If you are under 18, please involve a parent or guardian before buying a subscription. If we learn that we hold data from a child under ${MIN_AGE}, we will delete it. If you believe this has happened, contact us.

## 11. Security

We use encrypted connections (HTTPS), established providers with strong security practices, and access controls on our systems. No service can be completely secure, but we work to protect your data and will notify you and the regulator of a serious breach where the law requires.

## 12. Changes to this policy

We will update this policy when the Service or the law changes. If a change is significant, we will tell you in the app or on the website before it takes effect. The date at the top shows when it was last changed.

## 13. Contact

**${OPERATOR_NAME}**, ${SERVICE_NAME}
Email: **${CONTACT_EMAIL}**
`;
