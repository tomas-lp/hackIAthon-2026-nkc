import { BarriosMap } from "@/features/barrios/BarriosMap";
import { MapViewTabs } from "@/features/mapa/MapViewTabs";

export default function BarriosPage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-100">
      <BarriosMap />
      <MapViewTabs />
    </main>
  );
}
