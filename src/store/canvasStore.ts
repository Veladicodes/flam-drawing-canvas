import { create } from "zustand";

import { CLIENT_ID } from "../lib/session.ts";
import { compareStrokes, type Stroke, type Tool } from "../../shared/protocol.ts";

interface CanvasState {
  /** Committed strokes, in paint order. */
  strokes: Stroke[];
  /** This client's undone strokes, most-recent last, available for redo. */
  redoStack: Stroke[];

  /** Current brush settings. */
  tool: Tool;
  color: string;
  size: number;

  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;

  /** Replace the whole history (e.g. from server `init`). */
  setStrokes: (strokes: Stroke[]) => void;
  /** Append a stroke from a remote peer / history if unseen. */
  addStroke: (stroke: Stroke) => void;
  /** Append a stroke the local user just drew; clears the redo stack. */
  commitLocalStroke: (stroke: Stroke) => void;
  /** Remove a stroke by id (local undo or remote removal). */
  removeStroke: (id: string) => void;

  /**
   * Undo this client's most recent stroke. Returns the removed stroke so the
   * caller can notify the server, or null if there is nothing to undo.
   */
  undo: () => Stroke | null;
  /**
   * Redo this client's most recently undone stroke. Returns the restored
   * stroke so the caller can re-broadcast it, or null if nothing to redo.
   */
  redo: () => Stroke | null;
}

/** Insert keeping the deterministic (lamport, clientId) order; ignore dupes. */
const insertUnseen = (strokes: Stroke[], stroke: Stroke) =>
  strokes.some((s) => s.id === stroke.id)
    ? strokes
    : [...strokes, stroke].sort(compareStrokes);

export const useCanvasStore = create<CanvasState>((set, get) => ({
  strokes: [],
  redoStack: [],
  tool: "pen",
  color: "#e6e8ec",
  size: 4,

  setTool: (tool) => set({ tool }),
  setColor: (color) =>
    set((s) => ({ color, tool: s.tool === "eraser" ? "pen" : s.tool })),
  setSize: (size) => set({ size }),

  setStrokes: (strokes) =>
    set({ strokes: [...strokes].sort(compareStrokes), redoStack: [] }),
  addStroke: (stroke) => set((s) => ({ strokes: insertUnseen(s.strokes, stroke) })),
  commitLocalStroke: (stroke) =>
    set((s) => ({ strokes: insertUnseen(s.strokes, stroke), redoStack: [] })),
  removeStroke: (id) =>
    set((s) => ({ strokes: s.strokes.filter((stroke) => stroke.id !== id) })),

  undo: () => {
    const { strokes } = get();
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes[i].clientId !== CLIENT_ID) continue;
      const removed = strokes[i];
      set({
        strokes: strokes.filter((s) => s.id !== removed.id),
        redoStack: [...get().redoStack, removed],
      });
      return removed;
    }
    return null;
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;
    const restored = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      strokes: insertUnseen(get().strokes, restored),
    });
    return restored;
  },
}));
