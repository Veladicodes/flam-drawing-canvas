import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  decodeServerMessage,
  encode,
  type Stroke,
} from "../../shared/protocol.ts";
import { useCanvasStore } from "../store/canvasStore.ts";

const PARTY_HOST = import.meta.env.VITE_PARTYKIT_HOST || "127.0.0.1:1999";

/**
 * Opens a PartySocket for the given room and pipes server messages into the
 * canvas store. Returns connection status and a helper to publish local strokes.
 */
export function useRoomSocket(roomId: string) {
  const socketRef = useRef<PartySocket | null>(null);
  const [connected, setConnected] = useState(false);

  const setStrokes = useCanvasStore((s) => s.setStrokes);
  const addStroke = useCanvasStore((s) => s.addStroke);

  useEffect(() => {
    const socket = new PartySocket({
      host: PARTY_HOST,
      room: roomId,
      party: "main",
    });
    socketRef.current = socket;

    const onOpen = () => setConnected(true);
    const onClose = () => setConnected(false);
    const onMessage = (event: MessageEvent<string>) => {
      const msg = decodeServerMessage(event.data);
      if (!msg) return;
      if (msg.t === "init") {
        setStrokes(msg.strokes);
      } else if (msg.t === "stroke:add") {
        addStroke(msg.stroke);
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
      setConnected(false);
    };
  }, [roomId, setStrokes, addStroke]);

  const sendStroke = useCallback((stroke: Stroke) => {
    socketRef.current?.send(encode({ t: "stroke:add", stroke }));
  }, []);

  return { connected, sendStroke };
}
