/**
 * Default categories seeded for every new user.
 */
export type DefaultCategory = {
  name: string;
  label: string;
  color: string;
  emoji: string;
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Push", label: "Push", color: "#ef4444", emoji: "💪" },
  { name: "Pull", label: "Pull", color: "#10b981", emoji: "🧗" },
  { name: "Legs", label: "Legs", color: "#f59e0b", emoji: "🦵" },
  { name: "Core", label: "Core", color: "#8b5cf6", emoji: "🔥" },
  { name: "Static", label: "Static", color: "#06b6d4", emoji: "⚖️" },
  { name: "Skill", label: "Skill", color: "#ec4899", emoji: "🎯" },
  { name: "Mobility", label: "Mobility", color: "#84cc16", emoji: "🤸" },
];
