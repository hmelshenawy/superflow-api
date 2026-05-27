import type { ReactNode } from "react";

interface CustomerPortalLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function CustomerPortalLayout({ children, footer }: CustomerPortalLayoutProps) {
  return (
    <main className="min-h-screen bg-stone-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-32 pt-5 sm:px-6 sm:pt-8">
        <div className="space-y-4">{children}</div>
      </div>
      {footer}
    </main>
  );
}
