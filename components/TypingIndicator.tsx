"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-3">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-[#cbb994] animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-[#cbb994] animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-[#cbb994] animate-bounce [animation-delay:300ms]" />
    </div>
  );
}
