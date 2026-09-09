import { create } from "zustand";

import type { Stroke, Tool } from "../../shared/protocol.ts";

interface CanvasState {
  /** Committed strokes, in paint order. */
  strokes: Stroke[];
  /** Current brush settings (Tier 2 toolbar wires setters to these). */
  tool: Tool;
  color: string;
  size: number;

  /** Replace the whole history (e.g. from server `init`). */
  setStrokes: (strokes: Stroke[]) => void;
  /** Append one stroke if we haven't already seen its id. */
  addStroke: (stroke: Stroke) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  strokes: [],
  tool: "pen",
  color: "#e6e8ec",
  size: 4,

  setStrokes: (strokes) => set({ strokes }),
  addStroke: (stroke) =>
    set((state) => {
      if (state.strokes.some((s) => s.id === stroke.id)) return state;
      return { strokes: [...state.strokes, stroke] };
    }),
}));
