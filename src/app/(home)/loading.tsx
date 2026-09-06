function Skeleton({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-200 dark:bg-[#1a233b] ${className}`}
    />
  );
}

export default function HomeLoading() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-[#0b101d]">
      <Skeleton className="absolute inset-0 rounded-none bg-zinc-300/70 dark:bg-[#12192c]" />

      <div className="absolute left-1/2 top-4 z-20 h-9 w-64 -translate-x-1/2 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm" />
      <div className="absolute right-4 top-4 z-20 h-10 w-10 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm" />
      <div className="absolute bottom-6 right-6 z-20 h-11 w-11 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm" />
    </main>
  );
}
