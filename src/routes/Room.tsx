import { useParams } from "react-router-dom";

import { Canvas } from "../components/Canvas.tsx";

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <>
      <div className="hud">
        <span>room</span>
        <span className="room-id">{roomId}</span>
      </div>
      <Canvas />
    </>
  );
}
