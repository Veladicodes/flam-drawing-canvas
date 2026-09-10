import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { Canvas } from "../components/Canvas.tsx";
import { Presence } from "../components/Presence.tsx";
import { Toolbar } from "../components/Toolbar.tsx";
import { useRoomSocket } from "../net/useRoomSocket.ts";
import { useCanvasStore } from "../store/canvasStore.ts";

export function Room() {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const { connected, sendStroke, sendRemove } = useRoomSocket(roomId);
  const [copied, setCopied] = useState(false);

  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);

  const handleUndo = useCallback(() => {
    const removed = undo();
    if (removed) sendRemove(removed.id);
  }, [undo, sendRemove]);

  const handleRedo = useCallback(() => {
    const restored = redo();
    if (restored) sendStroke(restored);
  }, [redo, sendStroke]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <div className="hud">
        <span>room</span>
        <span className="room-id">{roomId}</span>
        <span className="status" data-connected={connected}>
          {connected ? "● live" : "○ connecting"}
        </span>
        <button className="hud-btn" onClick={copyLink}>
          {copied ? "copied!" : "copy invite link"}
        </button>
      </div>
      <Presence />
      <Canvas onStrokeComplete={sendStroke} />
      <Toolbar onUndo={handleUndo} onRedo={handleRedo} />
    </>
  );
}
