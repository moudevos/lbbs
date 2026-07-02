export type CourtesyRole = "water" | "soda" | "frozen" | "coffee" | "cappuccino" | "keke";
export type CourtesyType = CourtesyRole | "coffee_keke" | "cappuccino_keke";

export function legacyCourtesyLabelsForAmount(amount: number) {
  return amount > 60
    ? ["Frozen de fruta", "Cafe americano + keke de platano", "Capuchino + keke de platano", "Gaseosa + keke de platano"]
    : ["Agua", "Gaseosa personal"];
}

export function allowedCourtesyTypesForAmount(amount: number): CourtesyType[] {
  const labels = legacyCourtesyLabelsForAmount(amount);
  const types = new Set<CourtesyType>();
  for (const label of labels) {
    const normalized = label.toLowerCase();
    if (normalized.includes("agua")) types.add("water");
    if (normalized.includes("gaseosa")) types.add("soda");
    if (normalized.includes("frozen")) types.add("frozen");
    if (normalized.includes("cafe") || normalized.includes("café")) types.add("coffee_keke");
    if (normalized.includes("capuchino") || normalized.includes("cappuccino")) types.add("cappuccino_keke");
  }
  return Array.from(types);
}

export function courtesyTypeLabel(type: CourtesyType) {
  const labels: Record<CourtesyType, string> = {
    water: "Agua",
    soda: "Gaseosa",
    frozen: "Frozen",
    coffee: "Cafe",
    cappuccino: "Capuchino",
    keke: "Keke",
    coffee_keke: "Cafe + Keke",
    cappuccino_keke: "Capuchino + Keke"
  };
  return labels[type] ?? type;
}
