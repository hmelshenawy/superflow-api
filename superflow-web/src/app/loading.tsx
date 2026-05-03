import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 ring-1 ring-blue-500/30">
          <Skeleton className="h-5 w-5 rounded bg-blue-400/40" />
        </div>
        <Skeleton className="h-3 w-24 rounded-full" />
      </div>
    </div>
  );
}