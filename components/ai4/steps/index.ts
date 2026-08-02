import type { ComponentType } from "react";
import { Watch } from "./Watch";
import { Reflect } from "./Reflect";
import { Continue } from "./Continue";
import { EnterForest } from "./EnterForest";
import { Practice } from "./Practice";
import { Echo } from "./Echo";
import { Return } from "./Return";
import type { StepProps } from "./types";

export type { StepProps };

export const STEPS: { id: string; label: string; Component: ComponentType<StepProps> }[] = [
  { id: "watch", label: "Watch", Component: Watch },
  { id: "reflect", label: "Reflect", Component: Reflect },
  { id: "continue", label: "Continue", Component: Continue },
  { id: "forest", label: "Enter the Living Forest", Component: EnterForest },
  { id: "practice", label: "Practice", Component: Practice },
  { id: "echo", label: "Echo", Component: Echo },
  { id: "return", label: "Return", Component: Return },
];
