import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Login } from "./components/screens/Login";
import { SheetConnector } from "./components/screens/SheetConnector";
import { Brief } from "./components/screens/Brief";
import { Dashboard } from "./components/screens/Dashboard";
import { Import } from "./components/screens/Import";
import { Creators } from "./components/screens/Creators";
import { CreatorsOrdered } from "./components/screens/CreatorsOrdered";
import { Approvals } from "./components/screens/Approvals";
import { Orders } from "./components/screens/Orders";
import { Campaigns } from "./components/screens/Campaigns";
import { Settings } from "./components/screens/Settings";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/connect",
    Component: SheetConnector,
  },
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Campaigns },
      { path: "campaigns", Component: Campaigns },
      { path: "dashboard", Component: Dashboard },
      { path: "brief", Component: Brief },
      { path: "import", Component: Import },
      { path: "pipeline", Component: Creators },
      { path: "activations", Component: CreatorsOrdered },
      { path: "approvals", Component: Approvals },
      { path: "orders", Component: Orders },
      { path: "settings", Component: Settings },
    ],
  },
]);
