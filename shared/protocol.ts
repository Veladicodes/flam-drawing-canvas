/**
 * Wire protocol shared by the React client and the PartyKit server.
 * This is the single source of truth for every WebSocket payload.
 */

export const PROTOCOL_VERSION = 2;

// ---------------------------------------------------------------------------
// Domain model
// ---------------------------------------------------------------------------

export type Point = { x: number; y: number };

export type Tool = "pen" | "eraser";

export type Stroke = {
  id: string;
  clientId: string;
  tool: Tool;
  color: string;
  /** Brush width in CSS pixels. */
  size: number;
  /** Ordered path points, in canvas/CSS-pixel space. */
  points: Point[];
  /** `Date.now()` on the originating client. */
  createdAt: number;
};

/** A connected participant. Presence is ephemeral — never persisted. */
export type Peer = {
  id: string;
  name: string;
  color: string;
};

// ---------------------------------------------------------------------------
// Client -> server
// ---------------------------------------------------------------------------

export type ClientMessage =
  | { t: "hello"; name: string; color: string }
  | { t: "stroke:add"; stroke: Stroke }
  | { t: "stroke:remove"; id: string }
  | { t: "cursor"; x: number; y: number };

// ---------------------------------------------------------------------------
// Server -> client
// ---------------------------------------------------------------------------

export type ServerMessage =
  | {
      t: "init";
      /** Full stroke history, in paint order. */
      strokes: Stroke[];
      /** The connection id the server assigned to this client. */
      self: string;
      /** Everyone already in the room. */
      peers: Peer[];
    }
  | { t: "stroke:add"; stroke: Stroke }
  | { t: "stroke:remove"; id: string }
  | { t: "presence"; peers: Peer[] }
  | { t: "cursor"; id: string; x: number; y: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const encode = (msg: ClientMessage | ServerMessage): string =>
  JSON.stringify(msg);

export function decodeClientMessage(raw: string): ClientMessage | null {
  try {
    const msg = JSON.parse(raw) as ClientMessage;
    return msg && typeof msg.t === "string" ? msg : null;
  } catch {
    return null;
  }
}

export function decodeServerMessage(raw: string): ServerMessage | null {
  try {
    const msg = JSON.parse(raw) as ServerMessage;
    return msg && typeof msg.t === "string" ? msg : null;
  } catch {
    return null;
  }
}
