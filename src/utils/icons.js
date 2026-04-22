// Curated subset of Lucide icons available for the icon picker
// We export name → component mappings so the picker can render them
import * as LucideIcons from "lucide-react";

// All exported names that are valid React components (PascalCase, not utility exports)
const EXCLUDED = new Set(["createLucideIcon", "default"]);

export const ICON_MAP = Object.fromEntries(
  Object.entries(LucideIcons).filter(
    ([name, val]) =>
      !EXCLUDED.has(name) && /^[A-Z]/.test(name) && typeof val === "function",
  ),
);

export const ICON_NAMES = Object.keys(ICON_MAP).sort();

export function getIcon(name) {
  return ICON_MAP[name] || LucideIcons.Circle;
}
