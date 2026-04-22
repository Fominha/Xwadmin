import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { SheetConnector } from "./components/screens/SheetConnector";
import { Dashboard } from "./components/screens/Dashboard";
import { Import } from "./components/screens/Import";
import { Pipeline } from "./components/screens/Pipeline";
import { Negotiate } from "./components/screens/Negotiate";
import { Qualify } from "./components/screens/Qualify";
import { PushToClient } from "./components/screens/PushToClient";
import { Orders } from "./components/screens/Orders";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: SheetConnector },
      { path: "dashboard", Component: Dashboard },
      { path: "import", Component: Import },
      { path: "pipeline", Component: Pipeline },
      { path: "negotiate", Component: Negotiate },
      { path: "qualify", Component: Qualify },
      { path: "push-to-client", Component: PushToClient },
      { path: "orders", Component: Orders },
    ],
  },
]);
