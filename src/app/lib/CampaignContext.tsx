import { createContext, useContext, useState, ReactNode } from "react";

export interface ActiveCampaign {
  id: string;
  name: string;
  client_name: string;
  sheet_id: string;
}

interface CampaignContextValue {
  activeCampaign: ActiveCampaign | null;
  setActiveCampaign: (campaign: ActiveCampaign) => void;
  clearActiveCampaign: () => void;
}

const CampaignContext = createContext<CampaignContextValue>({
  activeCampaign: null,
  setActiveCampaign: () => {},
  clearActiveCampaign: () => {},
});

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [activeCampaign, setActiveCampaignState] = useState<ActiveCampaign | null>(null);

  const setActiveCampaign = (campaign: ActiveCampaign) => {
    setActiveCampaignState(campaign);
  };

  const clearActiveCampaign = () => {
    setActiveCampaignState(null);
  };

  return (
    <CampaignContext.Provider value={{ activeCampaign, setActiveCampaign, clearActiveCampaign }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  return useContext(CampaignContext);
}
