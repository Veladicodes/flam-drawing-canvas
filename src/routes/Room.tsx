import { useState } from "react";
import { useParams } from "react-router-dom";

import { Canvas } from "../components/Canvas.tsx";
import { useRoomSocket } from "../net/useRoomSocket.ts";

export function Room() {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const { connected, sendStroke } = useRoomSocket(roomId);
  const [copied, setCopied] = useState(false);

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
      <Canvas onStrokeComplete={sendStroke} />
    </>
  );
}
