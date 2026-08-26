function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-zinc-200 ${className}`} />
  );
}

export default function RegionesLoading() {
  return (
    <div className="min-h-screen overflow-hidden bg-zinc-100 px-6 pt-16 pb-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-2 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    </div>
  );
}
