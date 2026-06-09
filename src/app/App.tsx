import { RouterProvider } from "react-router";
import { router } from "./routes";
import { CampaignProvider } from "./lib/CampaignContext";

export default function App() {
  return (
    <CampaignProvider>
      <RouterProvider router={router} />
    </CampaignProvider>
  );
}