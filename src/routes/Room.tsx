import { useParams } from "react-router-dom";

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <div className="center">
      <p>
        Room <code>{roomId}</code> — canvas coming next.
      </p>
    </div>
  );
}
