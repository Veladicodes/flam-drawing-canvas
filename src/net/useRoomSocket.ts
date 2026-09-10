import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  type ClientMessage,
  decodeServerMessage,
  encode,
  type Point,
  type Stroke,
} from "../../shared/protocol.ts";
import { getIdentity } from "../lib/identity.ts";
import { useCanvasStore } from "../store/canvasStore.ts";
import { usePresenceStore } from "../store/presenceStore.ts";

const PARTY_HOST = import.meta.env.VITE_PARTYKIT_HOST || "127.0.0.1:1999";

export type ConnStatus = "connecting" | "live" | "reconnecting";

/** An outbound message plus the local store effect to replay it against. */
type Queued = { msg: ClientMessage; replay: () => void };

/**
 * Opens a PartySocket for the given room and pipes server messages into the
 * stores. Handles reconnection: `partysocket` reopens the socket automatically,
 * and on every (re)connect the server sends a fresh `init` that we treat as the
 * source of truth. Writes attempted while offline are buffered and replayed
 * after the post-reconnect resync so local work is never silently lost.
 */
export function useRoomSocket(roomId: string) {
  const socketRef = useRef<PartySocket | null>(null);
  const outbox = useRef<Queued[]>([]);
  const everConnected = useRef(false);
  const [status, setStatus] = useState<ConnStatus>("connecting");

  const setStrokes = useCanvasStore((s) => s.setStrokes);
  const addStroke = useCanvasStore((s) => s.addStroke);
  const removeStroke = useCanvasStore((s) => s.removeStroke);
  const setPeers = usePresenceStore((s) => s.setPeers);
  const setSelf = usePresenceStore((s) => s.setSelf);
  const setCursor = usePresenceStore((s) => s.setCursor);

  useEffect(() => {
    const socket = new PartySocket({
      host: PARTY_HOST,
      room: roomId,
      party: "main",
    });
    socketRef.current = socket;

    const onOpen = () => {
      const { name, color } = getIdentity();
      socket.send(encode({ t: "hello", name, color }));
      // `init` follows; the outbox is flushed once that resync lands.
    };
    const onClose = () => {
      setStatus(everConnected.current ? "reconnecting" : "connecting");
    };
    const onMessage = (event: MessageEvent<string>) => {
      const msg = decodeServerMessage(event.data);
      if (!msg) return;
      switch (msg.t) {
        case "init": {
          setStrokes(msg.strokes);
          setSelf(msg.self);
          setPeers(msg.peers);
          everConnected.current = true;
          setStatus("live");
          // Resync done — replay anything queued while we were offline.
          const pending = outbox.current;
          outbox.current = [];
          for (const { msg: queued, replay } of pending) {
            replay();
            socket.send(encode(queued));
          }
          break;
        }
        case "stroke:add":
          addStroke(msg.stroke);
          break;
        case "stroke:remove":
          removeStroke(msg.id);
          break;
        case "presence":
          setPeers(msg.peers);
          break;
        case "cursor":
          setCursor(msg.id, msg.x, msg.y);
          break;
      }
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      socket.close();
      socketRef.current = null;
      outbox.current = [];
      everConnected.current = false;
      setStatus("connecting");
    };
  }, [roomId, setStrokes, addStroke, removeStroke, setPeers, setSelf, setCursor]);

  /** Send now if the socket is open, otherwise queue for post-reconnect replay. */
  const dispatch = useCallback((msg: ClientMessage, replay: () => void) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(encode(msg));
    } else {
      outbox.current.push({ msg, replay });
    }
  }, []);

  const sendStroke = useCallback(
    (stroke: Stroke) =>
      dispatch({ t: "stroke:add", stroke }, () =>
        useCanvasStore.getState().addStroke(stroke),
      ),
    [dispatch],
  );

  const sendRemove = useCallback(
    (id: string) =>
      dispatch({ t: "stroke:remove", id }, () =>
        useCanvasStore.getState().removeStroke(id),
      ),
    [dispatch],
  );

  // Throttle cursor broadcasts to ~30ms with a trailing send so the final
  // resting position is never dropped. Cursors are disposable — never queued.
  const cursor = useRef({ last: 0, timer: 0 as number, pending: null as Point | null });
  useEffect(
    () => () => {
      if (cursor.current.timer) window.clearTimeout(cursor.current.timer);
    },
    [],
  );

  const sendCursor = useCallback((point: Point) => {
    const state = cursor.current;
    state.pending = point;
    const flush = () => {
      state.timer = 0;
      state.last = Date.now();
      const socket = socketRef.current;
      if (state.pending && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(encode({ t: "cursor", x: state.pending.x, y: state.pending.y }));
      }
      state.pending = null;
    };
    const elapsed = Date.now() - state.last;
    if (elapsed >= 30) flush();
    else if (!state.timer) state.timer = window.setTimeout(flush, 30 - elapsed);
  }, []);

  return {
    status,
    connected: status === "live",
    sendStroke,
    sendRemove,
    sendCursor,
  };
}
