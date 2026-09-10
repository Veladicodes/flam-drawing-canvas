import type * as Party from "partykit/server";

import {
  compareStrokes,
  decodeClientMessage,
  encode,
  type Peer,
  type Stroke,
} from "../shared/protocol.ts";

const STORAGE_KEY = "strokes";
const MAX_POINTS_PER_STROKE = 5000;
const MAX_NAME_LEN = 24;

/**
 * One instance per room id. PartyKit routes `/parties/main/:roomId` to a
 * dedicated durable instance, so each room is an isolated canvas.
 */
export default class DrawingServer implements Party.Server {
  private strokes: Stroke[] = [];
  /** Ephemeral presence, keyed by connection id. Never persisted. */
  private peers = new Map<string, Peer>();

  constructor(readonly room: Party.Room) {}

  /** Runs once before the first connection; rehydrate history from storage. */
  async onStart() {
    this.strokes =
      (await this.room.storage.get<Stroke[]>(STORAGE_KEY)) ?? [];
  }

  /** Send the full history + current presence to whoever just joined. */
  onConnect(conn: Party.Connection) {
    conn.send(
      encode({
        t: "init",
        // Pre-sorted into the deterministic order clients also enforce.
        strokes: [...this.strokes].sort(compareStrokes),
        self: conn.id,
        peers: [...this.peers.values()],
      }),
    );
  }

  async onMessage(raw: string, sender: Party.Connection) {
    const msg = decodeClientMessage(raw);
    if (!msg) return;

    switch (msg.t) {
      case "hello": {
        if (typeof msg.name !== "string" || typeof msg.color !== "string")
          return;
        this.peers.set(sender.id, {
          id: sender.id,
          name: msg.name.slice(0, MAX_NAME_LEN),
          color: msg.color.slice(0, 32),
        });
        this.broadcastPresence();
        break;
      }

      case "stroke:add": {
        if (!isValidStroke(msg.stroke)) return;
        this.strokes.push(msg.stroke);
        await this.room.storage.put(STORAGE_KEY, this.strokes);
        // Fan out to everyone except the sender, who already drew it locally.
        this.room.broadcast(
          encode({ t: "stroke:add", stroke: msg.stroke }),
          [sender.id],
        );
        break;
      }

      case "stroke:remove": {
        if (typeof msg.id !== "string") return;
        const next = this.strokes.filter((s) => s.id !== msg.id);
        if (next.length === this.strokes.length) return;
        this.strokes = next;
        await this.room.storage.put(STORAGE_KEY, this.strokes);
        this.room.broadcast(encode({ t: "stroke:remove", id: msg.id }), [
          sender.id,
        ]);
        break;
      }

      case "cursor": {
        if (typeof msg.x !== "number" || typeof msg.y !== "number") return;
        // Cursors are high-frequency and disposable — never stored.
        this.room.broadcast(
          encode({ t: "cursor", id: sender.id, x: msg.x, y: msg.y }),
          [sender.id],
        );
        break;
      }
    }
  }

  onClose(conn: Party.Connection) {
    if (this.peers.delete(conn.id)) this.broadcastPresence();
  }

  private broadcastPresence() {
    this.room.broadcast(
      encode({ t: "presence", peers: [...this.peers.values()] }),
    );
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
    typeof stroke.lamport === "number" &&
    Array.isArray(stroke.points) &&
    stroke.points.length > 0 &&
    stroke.points.length <= MAX_POINTS_PER_STROKE &&
    stroke.points.every(
      (p) => p && typeof p.x === "number" && typeof p.y === "number",
    )
  );
}

DrawingServer satisfies Party.Worker;
