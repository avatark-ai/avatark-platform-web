// Local-only state for the Ai4 conference demo (components/ai4/**). Never
// touches Supabase or any production Echo/account persistence -- this is a
// standalone kiosk experience, and its "memory" is scoped to the visitor's
// own browser via localStorage so the demo works offline and resets cleanly
// between conference attendees.

export const REFLECTION_CHIPS = [
  "Belonging",
  "Wonder",
  "Duty",
  "Courage",
  "Loss",
  "Compassion",
  "Hope",
  "Return",
] as const;

export type ReflectionChip = (typeof REFLECTION_CHIPS)[number];

const REFLECTION_KEY = "ai4-demo-reflection";
const STEP_KEY = "ai4-demo-step";

export const AI4_STEP_COUNT = 9;

function isReflectionChip(value: string | null): value is ReflectionChip {
  return value !== null && (REFLECTION_CHIPS as readonly string[]).includes(value);
}

export function readStoredReflection(): ReflectionChip | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(REFLECTION_KEY);
  return isReflectionChip(value) ? value : null;
}

export function writeStoredReflection(chip: ReflectionChip): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REFLECTION_KEY, chip);
}

export function readStoredStep(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STEP_KEY);
  const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < AI4_STEP_COUNT ? parsed : 0;
}

export function writeStoredStep(step: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STEP_KEY, String(step));
}

export function clearStoredDemoState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REFLECTION_KEY);
  window.localStorage.removeItem(STEP_KEY);
}
