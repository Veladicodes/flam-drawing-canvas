import type * as Party from "partykit/server";

import {
  decodeClientMessage,
  encode,
  type Stroke,
} from "../shared/protocol.ts";

const STORAGE_KEY = "strokes";
const MAX_POINTS_PER_STROKE = 5000;

/**
 * One instance per room id. PartyKit routes `/parties/main/:roomId` to a
 * dedicated durable instance, so each room is an isolated canvas.
 */
export default class DrawingServer implements Party.Server {
  private strokes: Stroke[] = [];

  constructor(readonly room: Party.Room) {}

  /** Runs once before the first connection; rehydrate history from storage. */
  async onStart() {
    this.strokes =
      (await this.room.storage.get<Stroke[]>(STORAGE_KEY)) ?? [];
  }

  /** Send the full history to whoever just joined. */
  onConnect(conn: Party.Connection) {
    conn.send(encode({ t: "init", strokes: this.strokes, self: conn.id }));
  }

  async onMessage(raw: string, sender: Party.Connection) {
    const msg = decodeClientMessage(raw);
    if (!msg || msg.t !== "stroke:add") return;
    if (!isValidStroke(msg.stroke)) return;

    this.strokes.push(msg.stroke);
    await this.room.storage.put(STORAGE_KEY, this.strokes);

    // Fan out to everyone except the sender, who already drew it locally.
    this.room.broadcast(encode({ t: "stroke:add", stroke: msg.stroke }), [
      sender.id,
    ]);
  }
}

function isValidStroke(s: unknown): s is Stroke {
  if (!s || typeof s !== "object") return false;
  const stroke = s as Partial<Stroke>;
  return (
    typeof stroke.id === "string" &&
    typeof stroke.clientId === "string" &&
    (stroke.tool === "pen" || stroke.tool === "eraser") &&
    typeof stroke.color === "string" &&
    typeof stroke.size === "number" &&
    Array.isArray(stroke.points) &&
    stroke.points.length > 0 &&
    stroke.points.length <= MAX_POINTS_PER_STROKE &&
    stroke.points.every(
      (p) => p && typeof p.x === "number" && typeof p.y === "number",
    )
  );
}

DrawingServer satisfies Party.Worker;
