import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./index.css";
import { newRoomId } from "./lib/ids.ts";
import { Room } from "./routes/Room.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to={`/room/${newRoomId()}`} replace />,
  },
  {
    path: "/room/:roomId",
    element: <Room />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
