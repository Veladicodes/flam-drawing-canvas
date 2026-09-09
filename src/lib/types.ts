// Local domain model for Tier 1. Extracted into `shared/protocol.ts` once the
// realtime layer lands so client and server share one definition.

export type Point = { x: number; y: number };

export type Tool = "pen" | "eraser";

export type Stroke = {
  id: string;
  clientId: string;
  tool: Tool;
  color: string;
  /** Brush width in CSS pixels. */
  size: number;
  /** Ordered path points, in canvas/CSS-pixel space. */
  points: Point[];
  /** `Date.now()` on the originating client. */
  createdAt: number;
};
