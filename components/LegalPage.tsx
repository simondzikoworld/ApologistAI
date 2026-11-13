import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";

// Shared shell for the legal pages (privacy, terms, account deletion): a
// readable single column, the site's colours in both themes, and links
// between the documents.
export default function LegalPage({ markdown, children }: { markdown?: string; children?: ReactNode }) {
  return (
    <main className="min-h-screen px-5 sm:px-8 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-[#cbb994] hover:underline mb-8"
        >
          ← Apologist AI
        </Link>

        {markdown && (
          <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:mt-10 prose-a:text-amber-600 dark:prose-a:text-[#cbb994] prose-table:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </article>
        )}
        {children}

        <LegalFooter />
      </div>
    </main>
  );
}

export function LegalFooter() {
  return (
    <nav className="mt-14 pt-6 border-t border-slate-200 dark:border-[#2c2722] flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-[#9d9484]">
      <Link href="/privacy" className="hover:text-amber-600 dark:hover:text-[#cbb994]">Privacy Policy</Link>
      <Link href="/terms" className="hover:text-amber-600 dark:hover:text-[#cbb994]">Terms of Use</Link>
      <Link href="/delete-account" className="hover:text-amber-600 dark:hover:text-[#cbb994]">Delete account</Link>
      <span className="ml-auto">© {new Date().getFullYear()} Apologist AI</span>
    </nav>
  );
}
