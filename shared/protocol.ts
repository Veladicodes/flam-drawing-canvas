/**
 * Wire protocol shared by the React client and the PartyKit server.
 * This is the single source of truth for every WebSocket payload.
 */

export const PROTOCOL_VERSION = 1;

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

// ---------------------------------------------------------------------------
// Client -> server
// ---------------------------------------------------------------------------

export type ClientMessage = {
  t: "stroke:add";
  stroke: Stroke;
};

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
    }
  | {
      t: "stroke:add";
      stroke: Stroke;
    };

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
