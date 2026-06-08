import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { AlertCircle, ArrowRight } from "lucide-react";
import { fetchSheetData } from "../../lib/mockApi";
import { getCurrentUser } from "../../lib/auth";

interface BriefData {
  campaignName: string;
  clientName: string;
  msaBudget: number;
  platform: string;
  contentFormat: string;
  postingStartDate: string;
  postingEndDate: string;
  hook: string;
  cta: string;
  complianceNotes: string;
  financialTriggerType: string;
  financialTriggerDate: string;
}

export function Brief() {
  const user = getCurrentUser();
  const isOps = user?.role === "ops";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [brief, setBrief] = useState<BriefData>({
    campaignName: "",
    clientName: "",
    msaBudget: 0,
    platform: "",
    contentFormat: "",
    postingStartDate: "",
    postingEndDate: "",
    hook: "",
    cta: "",
    complianceNotes: "",
    financialTriggerType: "",
    financialTriggerDate: "",
  });

  useEffect(() => {
    loadBrief();
  }, []);

  const loadBrief = async () => {
    setLoading(true);
    const sheetId = localStorage.getItem("xw_sheet_id") || "mock";

    try {
      const data = await fetchSheetData(sheetId, "Campaign_Brief");
      if (data.rows && data.rows.length > 0) {
        const row = data.rows[0];
        setBrief({
          campaignName: row.campaignName || "",
          clientName: row.clientName || "",
          msaBudget: row.msaBudget || 0,
          platform: row.platform || "",
          contentFormat: row.contentFormat || "",
          postingStartDate: row.postingStartDate || "",
          postingEndDate: row.postingEndDate || "",
          hook: row.hook || "",
          cta: row.cta || "",
          complianceNotes: row.complianceNotes || "",
          financialTriggerType: row.financialTriggerType || "",
          financialTriggerDate: row.financialTriggerDate || "",
        });
      }
    } catch (error) {
      console.error("Failed to load brief:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const sheetId = localStorage.getItem("xw_sheet_id");

    try {
      await fetch(`/api/sheets?sheetId=${sheetId}&tab=Campaign_Brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      alert("Brief saved successfully!");
    } catch (error) {
      alert("Failed to save brief");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof BriefData>(field: K, value: BriefData[K]) => {
    setBrief((prev) => ({ ...prev, [field]: value }));
  };

  const handleImportFromDoc = () => {
    if (!docUrl) return;

    // Check if brief already exists
    if (brief.campaignName || brief.clientName || brief.msaBudget > 0) {
      setShowOverwriteModal(true);
    } else {
      executeImport();
    }
  };

  const executeImport = async () => {
    setShowOverwriteModal(false);
    setImporting(true);
    try {
      // Simulate reading from Google Doc
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Auto-fill with sample data
      setBrief({
        campaignName: "Spring Fashion Campaign",
        clientName: "Luxe Apparel",
        msaBudget: 125000,
        platform: "Instagram",
        contentFormat: "Reel 30-60s",
        postingStartDate: "2026-05-01",
        postingEndDate: "2026-05-31",
        hook: "Showcase your spring style with sustainable fashion pieces that make a statement.",
        cta: "Shop the collection at luxeapparel.com",
        complianceNotes: "FTC disclosure required. No health claims. Must include #ad tag.",
        financialTriggerType: "CC Charged",
        financialTriggerDate: "2026-04-15",
      });
    } catch (error) {
      alert("Failed to import from document");
    } finally {
      setImporting(false);
    }
  };

  const calculateDaysUntilClose = () => {
    if (!brief.postingStartDate) return null;
    const startDate = new Date(brief.postingStartDate);
    const today = new Date();
    const diffTime = startDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilClose = calculateDaysUntilClose();

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#038B97] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-muted-foreground">Loading brief...</div>
        </div>
      </div>
    );
  }

  // Read-only view for Lead
  if (!isOps) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl mb-2">Campaign Brief</h1>
          <p className="text-sm text-muted-foreground">
            Read-only summary
          </p>
        </div>

        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="divide-y divide-border">
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">Campaign name</div>
              <div className="col-span-2">{brief.campaignName || "—"}</div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">Client</div>
              <div className="col-span-2">{brief.clientName || "—"}</div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">MSA Budget</div>
              <div className="col-span-2">${brief.msaBudget.toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">Creator target</div>
              <div className="col-span-2">20</div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">Supply chain closes</div>
              <div className="col-span-2">4/25/2026</div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">Platform</div>
              <div className="col-span-2">{brief.platform || "—"}</div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">Content format</div>
              <div className="col-span-2">{brief.contentFormat || "—"}</div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">Posting window</div>
              <div className="col-span-2">
                {brief.postingStartDate && brief.postingEndDate
                  ? `${new Date(brief.postingStartDate).toLocaleDateString()} – ${new Date(brief.postingEndDate).toLocaleDateString()}`
                  : "—"}
              </div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">Financial trigger</div>
              <div className="col-span-2">
                {brief.financialTriggerType && brief.financialTriggerDate
                  ? `${brief.financialTriggerType} on ${new Date(brief.financialTriggerDate).toLocaleDateString()}`
                  : "—"}
              </div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">Hook</div>
              <div className="col-span-2">{brief.hook || "—"}</div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">CTA</div>
              <div className="col-span-2">{brief.cta || "—"}</div>
            </div>
            <div className="grid grid-cols-3 p-4">
              <div className="text-sm text-muted-foreground">Compliance notes</div>
              <div className="col-span-2">{brief.complianceNotes || "—"}</div>
            </div>
          </div>
          <div className="p-4 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Brief is managed in Ops view.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Editable view for Ops
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl mb-2">Campaign Brief</h1>
        <p className="text-sm text-muted-foreground">
          Define campaign parameters and requirements
        </p>
      </div>

      <div className="bg-white rounded-lg border border-border p-6 space-y-3">
        <h3 className="text-sm">Import from Doc</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Paste Google Doc URL…"
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleImportFromDoc}
            disabled={!docUrl || importing}
            style={{ backgroundColor: "#038B97" }}
            className="flex items-center gap-2"
          >
            {importing ? "Reading document…" : (
              <>
                Import brief
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share the doc with xw-sheets@xw-admin-494105.iam.gserviceaccount.com first.
        </p>
      </div>

      {!brief.financialTriggerDate && (
        <div className="flex gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>Financial Trigger Date not set.</strong> The 7-day supply fill clock will start when this date is entered.
          </div>
        </div>
      )}

      {daysUntilClose !== null && daysUntilClose > 0 && (
        <div className="flex justify-center">
          <div
            className="px-4 py-2 rounded-full text-sm border"
            style={{
              backgroundColor: daysUntilClose <= 7 ? "#fef3c7" : "#e0f2f1",
              borderColor: daysUntilClose <= 7 ? "#f59e0b" : "#038B97",
              color: daysUntilClose <= 7 ? "#92400e" : "#065f46"
            }}
          >
            {daysUntilClose} days until supply chain closes
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Campaign Name</Label>
            <Input
              value={brief.campaignName}
              onChange={(e) => updateField("campaignName", e.target.value)}
              placeholder="e.g. Spring Fashion Campaign"
            />
          </div>
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input
              value={brief.clientName}
              onChange={(e) => updateField("clientName", e.target.value)}
              placeholder="e.g. Luxe Apparel"
            />
          </div>

          <div className="space-y-2">
            <Label>MSA Budget</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={brief.msaBudget || ""}
                onChange={(e) => updateField("msaBudget", parseFloat(e.target.value) || 0)}
                placeholder="125000"
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={brief.platform} onValueChange={(v) => updateField("platform", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
                <SelectItem value="Multi-platform">Multi-platform</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Content Format</Label>
            <Input
              value={brief.contentFormat}
              onChange={(e) => updateField("contentFormat", e.target.value)}
              placeholder="e.g. Reel 30-60s"
            />
          </div>

          <div className="space-y-2">
            <Label>Posting Start Date</Label>
            <Input
              type="date"
              value={brief.postingStartDate}
              onChange={(e) => updateField("postingStartDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Posting End Date</Label>
            <Input
              type="date"
              value={brief.postingEndDate}
              onChange={(e) => updateField("postingEndDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Financial Trigger Type</Label>
            <Select
              value={brief.financialTriggerType}
              onValueChange={(v) => updateField("financialTriggerType", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select trigger type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MSA Signed">MSA Signed</SelectItem>
                <SelectItem value="CC Charged">CC Charged</SelectItem>
                <SelectItem value="Wire Received">Wire Received</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Financial Trigger Date</Label>
            <Input
              type="date"
              value={brief.financialTriggerDate}
              onChange={(e) => updateField("financialTriggerDate", e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Hook</Label>
            <Textarea
              value={brief.hook}
              onChange={(e) => updateField("hook", e.target.value)}
              placeholder="The campaign angle for creators..."
              rows={3}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>CTA</Label>
            <Input
              value={brief.cta}
              onChange={(e) => updateField("cta", e.target.value)}
              placeholder="Exact call to action"
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Compliance Notes</Label>
            <Textarea
              value={brief.complianceNotes}
              onChange={(e) => updateField("complianceNotes", e.target.value)}
              placeholder="e.g. FTC disclosure required. No health claims..."
              rows={3}
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2"
          style={{ backgroundColor: "#038B97" }}
        >
          {saving ? "Saving..." : (
            <>
              Save brief
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-3">
          Saved locally for now — sheet sync coming soon.
        </p>
      </div>

      {/* Overwrite Confirmation Modal */}
      {showOverwriteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowOverwriteModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg border border-border shadow-2xl z-50 p-6 max-w-md">
            <h3 className="text-lg mb-2">Overwrite existing brief?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              A brief already exists for this campaign. Importing will overwrite all fields. Continue?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowOverwriteModal(false)}>
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: "#038B97" }}
                onClick={executeImport}
              >
                Overwrite
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
