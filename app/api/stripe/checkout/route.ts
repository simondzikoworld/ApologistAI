import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Send the customer back to the address they paid from. NEXT_PUBLIC_APP_URL
  // pointed at the vercel.app alias, where production Clerk keys don't work.
  const appUrl = req.nextUrl.origin;

  // Create a Stripe customer with clerkUserId in metadata so we can look them
  // up later when a subscription is cancelled or payment fails
  const customer = await stripe.customers.create({
    metadata: { clerkUserId: userId },
  });

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: `${appUrl}/?checkout=success`,
    cancel_url: `${appUrl}/#pricing`,
  });

  return NextResponse.json({ url: session.url });
}
