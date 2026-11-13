"use client";

import { useState } from "react";
import { useUser, useClerk, SignInButton } from "@clerk/nextjs";

// The interactive half of /delete-account: sign in, confirm, delete.
export default function DeleteAccountPanel({ contactEmail }: { contactEmail: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [confirmText, setConfirmText] = useState("");
  const [state, setState] = useState<"idle" | "deleting" | "done" | "error">("idle");

  if (!isLoaded) return null;

  if (state === "done") {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-5 text-emerald-800 dark:text-emerald-200">
        <p className="font-semibold">Your account has been deleted.</p>
        <p className="text-sm mt-1">Your conversations and data have been removed. If you had a Google Play subscription, make sure it is cancelled in Google Play.</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 dark:border-[#2c2722] bg-white dark:bg-[#1e1a16] p-5">
        <p className="font-semibold text-slate-900 dark:text-[#f5efe3]">Sign in to delete your account</p>
        <p className="text-sm text-slate-600 dark:text-[#9d9484] mt-1">
          Sign in with the account you want to delete. If you cannot sign in, email <strong>{contactEmail}</strong> from the address on the account and we will delete it for you.
        </p>
        <SignInButton mode="modal" forceRedirectUrl="/delete-account">
          <button className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 dark:bg-[#cbb994] text-white dark:text-[#1c1813] text-sm font-semibold hover:bg-amber-600 dark:hover:bg-[#e3d2ad] transition-colors">
            Sign in
          </button>
        </SignInButton>
      </div>
    );
  }

  const ready = confirmText.trim().toUpperCase() === "DELETE";

  async function onDelete() {
    setState("deleting");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
      await signOut({ redirectUrl: "/delete-account" }).catch(() => {});
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-[#1e1a16] p-5">
      <p className="font-semibold text-slate-900 dark:text-[#f5efe3]">
        Delete {user.primaryEmailAddress?.emailAddress ?? "this account"}
      </p>
      <p className="text-sm text-slate-600 dark:text-[#9d9484] mt-1">
        This permanently deletes your account, saved conversations and Pro status. It cannot be undone.
      </p>
      <label className="block text-sm text-slate-700 dark:text-[#d8cfc0] mt-4">
        Type <strong>DELETE</strong> to confirm
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-1.5 block w-full max-w-xs rounded-xl border border-slate-300 dark:border-[#2c2722] bg-white dark:bg-[#141210] px-3 py-2 text-slate-900 dark:text-[#f5efe3]"
          autoComplete="off"
        />
      </label>
      <button
        onClick={onDelete}
        disabled={!ready || state === "deleting"}
        className="mt-4 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {state === "deleting" ? "Deleting…" : "Permanently delete my account"}
      </button>
      {state === "error" && (
        <p className="text-sm text-red-600 mt-3">
          Something went wrong and nothing was deleted from your login. Please try again, or email {contactEmail}.
        </p>
      )}
    </div>
  );
}
