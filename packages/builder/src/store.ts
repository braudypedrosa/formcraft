import { createStore } from "zustand/vanilla";
import type { FormDefinition } from "@formcraft/core";
export function createEditorStore(initial: FormDefinition) {
  return createStore<{
    document: FormDefinition;
    past: FormDefinition[];
    future: FormDefinition[];
    group: string | null;
    commit: (next: FormDefinition, group?: string) => void;
    end: () => void;
    undo: () => void;
    redo: () => void;
    replace: (next: FormDefinition) => void;
  }>((set) => ({
    document: initial,
    past: [],
    future: [],
    group: null,
    commit: (next, group) =>
      set((s) =>
        JSON.stringify(next) === JSON.stringify(s.document)
          ? s
          : {
              document: next,
              past:
                group && group === s.group
                  ? s.past
                  : [...s.past, s.document].slice(-100),
              future: [],
              group: group ?? null,
            },
      ),
    end: () => set({ group: null }),
    undo: () =>
      set((s) =>
        s.past.length
          ? {
              document: s.past.at(-1)!,
              past: s.past.slice(0, -1),
              future: [s.document, ...s.future],
              group: null,
            }
          : s,
      ),
    redo: () =>
      set((s) =>
        s.future.length
          ? {
              document: s.future[0],
              past: [...s.past, s.document],
              future: s.future.slice(1),
              group: null,
            }
          : s,
      ),
    replace: (document) => set({ document, past: [], future: [], group: null }),
  }));
}
