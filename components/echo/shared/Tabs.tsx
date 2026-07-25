"use client";

// A small, dependency-free accessible tabs primitive (ARIA tabs pattern:
// roving tabindex, arrow-key navigation, aria-selected/aria-controls) --
// shared by Echo detail, My Echo, and anywhere else this app needs tabs,
// so each doesn't reinvent keyboard handling. Works fully with motion
// disabled (no transition is load-bearing for correctness).
import { useState, type ReactNode } from "react";

export interface TabDefinition {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ tabs, initialTabId }: { tabs: TabDefinition[]; initialTabId?: string }) {
  const [activeId, setActiveId] = useState(initialTabId ?? tabs[0]?.id);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    setActiveId(nextTab.id);
    document.getElementById(`tab-${nextTab.id}`)?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Sections" className="flex gap-6 overflow-x-auto border-b" style={{ borderColor: "var(--surface-line)" }}>
        {tabs.map((tab, index) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className="shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: active ? "var(--gold)" : "transparent",
                color: active ? "var(--paper)" : "var(--text-dim)",
                outlineColor: "var(--gold)",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} id={`tabpanel-${tab.id}`} role="tabpanel" aria-labelledby={`tab-${tab.id}`} hidden={tab.id !== activeId} className="py-8">
          {tab.content}
        </div>
      ))}
    </div>
  );
}
