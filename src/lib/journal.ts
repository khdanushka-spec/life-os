import type { Mood } from "@/generated/prisma/client";

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: "GREAT", emoji: "\u{1F600}", label: "Great" },
  { value: "GOOD", emoji: "\u{1F642}", label: "Good" },
  { value: "OKAY", emoji: "\u{1F610}", label: "Okay" },
  { value: "LOW", emoji: "\u{1F615}", label: "Low" },
  { value: "ROUGH", emoji: "\u{1F61E}", label: "Rough" },
];

export function moodMeta(mood: Mood | null) {
  return MOODS.find((m) => m.value === mood) ?? null;
}
