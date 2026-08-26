import * as L from "leaflet";

declare module "leaflet" {
  namespace HeatLayer {
    interface Options {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<string, string>;
    }
  }

  type HeatLatLngTuple = [number, number, number];

  interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    addLatLng(latlng: HeatLatLngTuple): this;
    setOptions(options: HeatLayer.Options): this;
    redraw(): this;
  }

  function heatLayer(
    latlngs: HeatLatLngTuple[],
    options?: HeatLayer.Options
  ): HeatLayer;
}

export {};
