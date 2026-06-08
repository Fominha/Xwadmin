import { useEffect } from "react";
import { RouterProvider, useNavigate } from "react-router";
import { router } from "./routes";
import { getCurrentUser } from "./lib/auth";

export default function App() {
  return <RouterProvider router={router} />;
}