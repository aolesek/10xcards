import type { ReactNode } from "react";

interface StudyLayoutProps {
  children: ReactNode;
}

export function StudyLayout({ children }: StudyLayoutProps) {
  return (
    <div className="min-h-svh">
      <div className="container mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="flex min-h-[calc(100svh-3rem)] flex-col gap-6">
          {children}
        </div>
      </div>
    </div>
  );
}

