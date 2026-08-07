export function descripcionPuntos(nivel: string): number {
  switch (nivel) {
    case "EVACUADOS":
      return 35;
    case "AGUA_CASAS":
      return 20;
    case "NO_CIRCULAR":
      return 10;
    default:
      return 5;
  }
}

export function climaPuntos(mm: number): number {
  if (mm < 10) return 0;
  if (mm < 25) return 5;
  if (mm < 50) return 10;
  return 20;
}
