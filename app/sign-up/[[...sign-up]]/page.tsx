import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <SignUp />
      {/* Consent notice — also covers questions that may reveal religious beliefs (Privacy Policy §4). */}
      <p className="max-w-sm text-center text-xs leading-relaxed text-slate-500 dark:text-[#9d9484]">
        By creating an account you agree to the <Link href="/terms" className="underline">Terms of Use</Link> and
        the <Link href="/privacy" className="underline">Privacy Policy</Link>, including that your questions (which may
        reveal religious beliefs) are processed by AI providers to answer you.
      </p>
    </div>
  );
}
