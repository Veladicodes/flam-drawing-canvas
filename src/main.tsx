import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { nanoid } from "nanoid";

import "./index.css";
import { Room } from "./routes/Room.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to={`/room/${nanoid(10)}`} replace />,
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
