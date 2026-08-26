"use client";

import type { ComponentProps } from "react";
import { ReportMap } from "@/components/map/ReportMap";

type HomeMapViewProps = ComponentProps<typeof ReportMap>;

export function HomeMapView(props: HomeMapViewProps) {
  return (
    <section className="absolute inset-0 h-full w-full">
      <ReportMap {...props} />
    </section>
  );
}
