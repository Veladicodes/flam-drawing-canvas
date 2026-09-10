import { useParams } from "react-router-dom";

import { Canvas } from "../components/Canvas.tsx";
import { useRoomSocket } from "../net/useRoomSocket.ts";

export function Room() {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const { connected, sendStroke } = useRoomSocket(roomId);

  return (
    <>
      <div className="hud">
        <span>room</span>
        <span className="room-id">{roomId}</span>
        <span className="status" data-connected={connected}>
          {connected ? "● live" : "○ connecting"}
        </span>
      </div>
      <Canvas onStrokeComplete={sendStroke} />
    </>
  );
}
