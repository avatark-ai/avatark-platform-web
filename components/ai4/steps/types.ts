import type { ReflectionChip } from "@/lib/ai4/reflection";

export type StepProps = {
  reflection: ReflectionChip | null;
  onSelectReflection: (chip: ReflectionChip) => void;
};
