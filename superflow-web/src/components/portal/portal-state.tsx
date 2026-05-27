import { CheckCircle, Loader2, XCircle } from "lucide-react";

interface PortalStateProps {
  type: "loading" | "error" | "submitted" | "empty";
  title?: string;
  message?: string;
}

export function PortalState({ type, title, message }: PortalStateProps) {
  const icon =
    type === "loading" ? (
      <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
    ) : type === "submitted" ? (
      <CheckCircle className="h-14 w-14 text-emerald-500" />
    ) : (
      <XCircle className="h-12 w-12 text-rose-500" />
    );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-5 text-center text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      {icon}
      {type !== "loading" && (
        <>
          <h1 className="mt-4 text-2xl font-bold">{title}</h1>
          {message && <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>}
        </>
      )}
    </main>
  );
}
