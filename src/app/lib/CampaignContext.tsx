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

const STORAGE_KEY = "xw_active_campaign";
const ID_KEY = "xw_campaign_id";

function loadPersisted(): ActiveCampaign | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string") return parsed as ActiveCampaign;
    return null;
  } catch {
    return null;
  }
}

const CampaignContext = createContext<CampaignContextValue>({
  activeCampaign: null,
  setActiveCampaign: () => {},
  clearActiveCampaign: () => {},
});

export function CampaignProvider({ children }: { children: ReactNode }) {
  // lazy init: rehydrate from localStorage on first render
  const [activeCampaign, setActiveCampaignState] = useState<ActiveCampaign | null>(
    () => loadPersisted()
  );

  const setActiveCampaign = (campaign: ActiveCampaign) => {
    setActiveCampaignState(campaign);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign));
      localStorage.setItem(ID_KEY, campaign.id); // mirror id for screens reading xw_campaign_id
    } catch {
      // localStorage unavailable (private mode / SSR preview) — in-memory state still works
    }
  };

  const clearActiveCampaign = () => {
    setActiveCampaignState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ID_KEY);
    } catch {
      // no-op
    }
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
