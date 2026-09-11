import { ShelfType, SystemShelfKey } from "@/generated/prisma/enums";

export const SYSTEM_SHELVES = [
  { name: "Favoritos", normalizedName: "favoritos", type: ShelfType.SYSTEM, systemKey: SystemShelfKey.FAVORITES },
  { name: "Quero ler", normalizedName: "quero ler", type: ShelfType.SYSTEM, systemKey: SystemShelfKey.WANT_TO_READ },
  { name: "Lidos", normalizedName: "lidos", type: ShelfType.SYSTEM, systemKey: SystemShelfKey.READ },
] as const;
