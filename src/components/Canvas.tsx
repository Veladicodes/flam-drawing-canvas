import { useCallback, useEffect, useRef } from "react";

import { fitCanvasToDisplay, renderStroke, repaint } from "../lib/draw.ts";
import { newStrokeId } from "../lib/ids.ts";
import { CLIENT_ID } from "../lib/session.ts";
import type { Point, Stroke } from "../../shared/protocol.ts";
import { useCanvasStore } from "../store/canvasStore.ts";

type Props = {
  /** Called when the local user finishes a stroke. */
  onStrokeComplete?: (stroke: Stroke) => void;
  /** Called on every pointer move over the canvas (hovering or drawing). */
  onCursorMove?: (point: Point) => void;
};

export function Canvas({ onStrokeComplete, onCursorMove }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const draftRef = useRef<Stroke | null>(null);

  const strokes = useCanvasStore((s) => s.strokes);
  const commitLocalStroke = useCanvasStore((s) => s.commitLocalStroke);

  // Set up the context once and keep it sized to the viewport.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const onResize = () => {
      fitCanvasToDisplay(canvas, ctx);
      repaint(ctx, useCanvasStore.getState().strokes);
      const draft = draftRef.current;
      if (draft) renderStroke(ctx, draft);
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Repaint whenever committed history changes (local commit or remote stroke).
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    repaint(ctx, strokes);
    const draft = draftRef.current;
    if (draft) renderStroke(ctx, draft);
  }, [strokes]);

  const pointFromEvent = useCallback((e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.currentTarget.setPointerCapture(e.pointerId);

      const { tool, color, size } = useCanvasStore.getState();
      draftRef.current = {
        id: newStrokeId(),
        clientId: CLIENT_ID,
        tool,
        color,
        size,
        points: [pointFromEvent(e)],
        createdAt: Date.now(),
      };
    },
    [pointFromEvent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const point = pointFromEvent(e);
      onCursorMove?.(point);

      const draft = draftRef.current;
      const ctx = ctxRef.current;
      if (!draft || !ctx) return;

      const prev = draft.points[draft.points.length - 1];
      const next = point;
      draft.points.push(next);

      // Draw just the new segment for a zero-latency local feel.
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = draft.size;
      ctx.globalCompositeOperation =
        draft.tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = draft.color;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
      ctx.restore();
    },
    [pointFromEvent],
  );

  const finishStroke = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const draft = draftRef.current;
      if (!draft) return;
      draftRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
      commitLocalStroke(draft);
      onStrokeComplete?.(draft);
    },
    [commitLocalStroke, onStrokeComplete],
  );

  return (
    <canvas
      ref={canvasRef}
      className="canvas-surface"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
    />
  );
}
