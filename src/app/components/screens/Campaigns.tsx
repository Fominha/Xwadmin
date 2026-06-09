import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Plus, Layers } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { EmptyState } from "../EmptyState";
import { supabase } from "../../lib/supabase";
import { useCampaign } from "../../lib/CampaignContext";

interface Campaign {
  id: string;
  name: string;
  client_name: string;
  sheet_id: string;
  brief: string | null;
  status: "Draft" | "Active" | "Completed";
  created_at: string;
  creatorCount?: number;
}

const statusStyles: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  Active: "bg-[#038B97]/10 text-[#038B97] border-[#038B97]/20",
  Completed: "bg-muted text-muted-foreground border-border",
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${m[date.getMonth()]} ${date.getDate()}`;
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-border p-6 space-y-3 animate-pulse">
      <div className="h-5 bg-muted rounded w-2/3" />
      <div className="h-4 bg-muted rounded w-1/3" />
      <div className="h-4 bg-muted rounded w-1/4" />
      <div className="h-8 bg-muted rounded w-full mt-4" />
    </div>
  );
}

export function Campaigns() {
  const navigate = useNavigate();
  const { setActiveCampaign } = useCampaign();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formClient, setFormClient] = useState("");
  const [formSheetUrl, setFormSheetUrl] = useState("");
  const [formBrief, setFormBrief] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fetch creator counts for each campaign
    const withCounts = await Promise.all(
      data.map(async (c) => {
        const { count } = await supabase
          .from("creators")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", c.id);
        return { ...c, creatorCount: count ?? 0 };
      })
    );

    setCampaigns(withCounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const resetForm = () => {
    setFormName("");
    setFormClient("");
    setFormSheetUrl("");
    setFormBrief("");
    setFormError("");
  };

  const handleCreate = async () => {
    if (!formName.trim()) { setFormError("Campaign name is required."); return; }
    if (!formClient.trim()) { setFormError("Client name is required."); return; }
    if (!formSheetUrl.trim()) { setFormError("Google Sheet URL is required."); return; }

    const match = formSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)\//);
    if (!match) { setFormError("Could not extract sheet ID. Check the URL format."); return; }
    const sheetId = match[1];

    setCreating(true);
    setFormError("");

    const { error } = await supabase.from("campaigns").insert({
      name: formName.trim(),
      client_name: formClient.trim(),
      sheet_id: sheetId,
      brief: formBrief.trim() || null,
      status: "Draft",
      created_at: new Date().toISOString(),
    });

    setCreating(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setModalOpen(false);
    resetForm();
    setToastMsg("Campaign created");
    fetchCampaigns();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl mb-2">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Manage your active and past campaigns</p>
        </div>
        <Button
          style={{ backgroundColor: "#038B97" }}
          className="flex items-center gap-2"
          onClick={() => { resetForm(); setModalOpen(true); }}
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <EmptyState
            icon={Layers}
            heading="No campaigns yet"
            description="Create your first campaign to get started."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border border-border p-6 flex flex-col gap-3 hover:border-[#038B97]/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-base mb-0.5">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{c.client_name}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs border whitespace-nowrap ${statusStyles[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {c.creatorCount} creator{c.creatorCount !== 1 ? "s" : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                Created {formatRelativeTime(c.created_at)}
              </div>
              <Button
                variant="outline"
                className="mt-auto w-full"
                style={{ borderColor: "#038B97", color: "#038B97" }}
                onClick={() => {
                  setActiveCampaign({ id: c.id, name: c.name, client_name: c.client_name, sheet_id: c.sheet_id });
                  navigate("/pipeline");
                }}
              >
                Open Pipeline →
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Campaign name <span className="text-destructive">*</span></Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Summer Launch 2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client name <span className="text-destructive">*</span></Label>
              <Input
                value={formClient}
                onChange={(e) => setFormClient(e.target.value)}
                placeholder="e.g. StyleBrand Co"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Google Sheet URL <span className="text-destructive">*</span></Label>
              <Input
                value={formSheetUrl}
                onChange={(e) => setFormSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="text-xs text-muted-foreground">Sheet ID will be extracted automatically.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Brief <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                value={formBrief}
                onChange={(e) => setFormBrief(e.target.value)}
                placeholder="Campaign brief, goals, notes..."
                rows={3}
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setModalOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                style={{ backgroundColor: "#038B97" }}
                disabled={creating}
                onClick={handleCreate}
              >
                {creating ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
