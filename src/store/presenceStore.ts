import { create } from "zustand";

import type { Peer } from "../../shared/protocol.ts";

/** Live cursor position for a remote peer, in canvas/CSS-pixel space. */
export type Cursor = { x: number; y: number; ts: number };

interface PresenceState {
  /** This client's own connection id, from the server `init` message. */
  self: string;
  /** Everyone currently connected, including self. */
  peers: Peer[];
  /** Remote cursor positions keyed by connection id. */
  cursors: Record<string, Cursor>;

  setSelf: (self: string) => void;
  setPeers: (peers: Peer[]) => void;
  setCursor: (id: string, x: number, y: number) => void;
  dropCursor: (id: string) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  self: "",
  peers: [],
  cursors: {},

  setSelf: (self) => set({ self }),

  setPeers: (peers) =>
    set((state) => {
      // Drop cursors for peers that have left.
      const live = new Set(peers.map((p) => p.id));
      const cursors: Record<string, Cursor> = {};
      for (const [id, cursor] of Object.entries(state.cursors)) {
        if (live.has(id)) cursors[id] = cursor;
      }
      return { peers, cursors };
    }),
  setCursor: (id, x, y) =>
    set((state) => ({ cursors: { ...state.cursors, [id]: { x, y, ts: Date.now() } } })),
  dropCursor: (id) =>
    set((state) => {
      const { [id]: _gone, ...rest } = state.cursors;
      return { cursors: rest };
    }),
}));
