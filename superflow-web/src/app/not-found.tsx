import Link from "next/link";
import { FileQuestion, Wrench } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200">
        <FileQuestion className="h-7 w-7 text-slate-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        <Wrench className="h-4 w-4" /> Back to Workshop Board
      </Link>
    </div>
  );
}