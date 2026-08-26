function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-zinc-200 ${className}`} />
  );
}

export default function HomeLoading() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100">
      <div className="absolute left-0 top-0 z-10 m-4 flex h-[min(88vh,680px)] w-[min(370px,calc(100vw-2rem))] flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Skeleton className="h-12 w-20 rounded-xl bg-zinc-300" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="mt-2 flex flex-1 flex-col gap-3 overflow-hidden">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>

      <Skeleton className="absolute inset-0 rounded-none bg-zinc-300/70" />

      <div className="absolute left-1/2 top-4 z-20 h-9 w-64 -translate-x-1/2 rounded-full bg-white/80 shadow-sm" />
      <div className="absolute right-4 top-4 z-20 h-10 w-10 rounded-full bg-white/80 shadow-sm" />
      <div className="absolute bottom-6 right-6 z-20 h-11 w-11 rounded-full bg-white/80 shadow-sm" />
    </main>
  );
}
