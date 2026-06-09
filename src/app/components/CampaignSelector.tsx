import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Layers } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";
import { useCampaign, ActiveCampaign } from "../lib/CampaignContext";

interface CampaignRow {
  id: string;
  name: string;
  client_name: string;
  sheet_id: string;
  status: string;
}

interface CampaignSelectorProps {
  onCampaignChange?: () => void;
}

export function CampaignSelector({ onCampaignChange }: CampaignSelectorProps) {
  const navigate = useNavigate();
  const { activeCampaign, setActiveCampaign } = useCampaign();
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, client_name, sheet_id, status")
      .order("created_at", { ascending: false });
    setCampaigns(data ?? []);
    setLoading(false);
  };

  const handleOpen = () => {
    if (!open) fetchCampaigns();
    setOpen(o => !o);
  };

  const handleSelect = (c: CampaignRow) => {
    setActiveCampaign({ id: c.id, name: c.name, client_name: c.client_name, sheet_id: c.sheet_id });
    setOpen(false);
    onCampaignChange?.();
  };

  if (!activeCampaign) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center justify-between">
        <span className="text-sm text-amber-700">No campaign selected — pick one to continue.</span>
        <Button
          size="sm"
          variant="outline"
          style={{ borderColor: "#038B97", color: "#038B97" }}
          onClick={() => navigate("/")}
        >
          <Layers className="w-4 h-4 mr-1.5" />
          Select campaign
        </Button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative bg-white border-b border-border px-8 py-2.5 flex items-center">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 text-sm hover:text-[#038B97] transition-colors group"
      >
        <span className="text-muted-foreground">Working on:</span>
        <span className="text-foreground">{activeCampaign.name}</span>
        <span className="text-muted-foreground">—</span>
        <span className="text-muted-foreground">{activeCampaign.client_name}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-8 mt-1 w-80 bg-white rounded-lg border border-border shadow-lg z-50">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No campaigns found.</div>
          ) : (
            <div className="py-1 max-h-64 overflow-y-auto">
              {campaigns.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center justify-between ${
                    c.id === activeCampaign.id ? "bg-[#038B97]/5" : ""
                  }`}
                >
                  <div>
                    <div className={`text-sm ${c.id === activeCampaign.id ? "text-[#038B97]" : "text-foreground"}`}>
                      {c.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.client_name}</div>
                  </div>
                  {c.id === activeCampaign.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#038B97] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-border p-2">
            <button
              onClick={() => { setOpen(false); navigate("/"); }}
              className="w-full text-left px-3 py-1.5 text-xs text-[#038B97] hover:bg-muted rounded transition-colors"
            >
              View all campaigns →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
