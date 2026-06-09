import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Upload, ArrowRight, FileSpreadsheet } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { getCurrentUser } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { fetchLatestExport, normalizeHandle } from "../../lib/sheetsApi";
import { useCampaign } from "../../lib/CampaignContext";
import { CampaignSelector } from "../CampaignSelector";

interface RecentImport {
  label: string;
  date: string;
  creatorsAdded: number;
  duplicatesSkipped: number;
}

export function Import() {
  const navigate = useNavigate();
  const { activeCampaign } = useCampaign();

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role !== "ops") {
      navigate("/dashboard");
    }
  }, [navigate]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ newCreators: number; duplicates: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [recentImports, setRecentImports] = useState<RecentImport[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setUploading(false);
        }
      }, 200);
    }
  };

  const handleSheetImport = async () => {
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      if (!activeCampaign) {
        setImportError("Select a campaign first, then import.");
        setImporting(false);
        return;
      }

      const campaignId = activeCampaign.id;

      if (!activeCampaign.sheet_id) {
        setImportError("This campaign has no linked sheet.");
        setImporting(false);
        return;
      }

      const rows = await fetchLatestExport(activeCampaign.sheet_id);
      const totalRows = rows.length;

      // Map rows, keeping raw handle in `handle` and computed normalized_handle separately.
      // Skip rows where normalized_handle is empty.
      const toUpsert = rows.flatMap(row => {
        const rawHandle = row["Handle"] ?? row["handle"] ?? "";
        const normalizedHandle = normalizeHandle(rawHandle);
        if (!normalizedHandle) return [];

        const rawCategories = row["Categories"] ?? row["categories"] ?? "";
        const nicheTags = rawCategories
          ? rawCategories.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        const rawOffer = row["Offer"] ?? row["offer"] ?? "";
        const offer = rawOffer !== "" ? parseFloat(rawOffer) : null;

        return [{
          campaign_id: campaignId,
          handle: rawHandle,
          normalized_handle: normalizedHandle,
          name: row["Creator"] ?? row["creator"] ?? row["Name"] ?? row["name"] ?? "",
          email: row["Email"] ?? row["email"] ?? "",
          niche_tags: nicheTags,
          followers: parseInt(row["Followers"] ?? row["followers"] ?? "0") || 0,
          expected_plays: parseInt(row["Exp. Plays"] ?? row["exp_plays"] ?? "0") || null,
          engagement: parseInt(row["Exp. Interactions"] ?? row["exp_interactions"] ?? "0") || null,
          offer: offer,
          status: "New",
          created_at: new Date().toISOString(),
        }];
      });

      // Upsert in batches of 1000, accumulate inserted IDs.
      const BATCH_SIZE = 1000;
      let totalInserted = 0;
      let upsertError: string | null = null;

      for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
        const batch = toUpsert.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from("creators")
          .upsert(batch, { onConflict: "campaign_id,normalized_handle", ignoreDuplicates: true })
          .select("id");

        if (error) {
          upsertError = error.message;
          break;
        }
        totalInserted += data?.length ?? 0;
      }

      if (upsertError) {
        setImportError(upsertError);
        return;
      }

      const duplicates = totalRows - totalInserted;
      setImportResult({ newCreators: totalInserted, duplicates });
      addRecentImport(totalInserted, duplicates);
    } catch (err: any) {
      setImportError(err?.message ?? "Import failed — check the sheet connection.");
    } finally {
      setImporting(false);
    }
  };

  const addRecentImport = (added: number, skipped: number) => {
    const now = new Date();
    const label = `Import ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    const date = now.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    setRecentImports(prev => [{ label, date, creatorsAdded: added, duplicatesSkipped: skipped }, ...prev].slice(0, 10));
  };

  return (
    <div>
      <CampaignSelector />
      <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl mb-2">Import Creators</h1>
        <p className="text-sm text-muted-foreground">
          Upload CSV or import directly from your connected Google Sheet
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 — Upload CSV */}
        <div className="bg-white rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-6 h-6 text-[#038B97]" />
            <h3 className="text-lg">Upload CSV</h3>
          </div>

          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center bg-white rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-[#038B97] transition-colors"
          >
            <Upload className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm mb-1">Drop CSV export from XW App here</p>
            <p className="text-xs text-muted-foreground">or click to upload</p>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Card 2 — Import from Sheet */}
        <div className="bg-white rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <FileSpreadsheet className="w-6 h-6 text-[#038B97]" />
            <h3 className="text-lg">Import from Sheet</h3>
          </div>

          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-center text-muted-foreground">
              Import from Latest_Export tab
            </p>
            <Button
              onClick={handleSheetImport}
              disabled={importing || !activeCampaign}
              style={{ backgroundColor: "#038B97" }}
              className="flex items-center gap-2"
            >
              {importing ? "Importing..." : (
                <>
                  Import from Latest_Export
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {importError && (
            <p className="text-sm text-destructive text-center">{importError}</p>
          )}
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className="bg-white rounded-lg border border-border p-6 space-y-4">
          <h3 className="text-lg">Import Complete</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-3xl text-[#038B97] mb-1">{importResult.newCreators}</div>
              <div className="text-sm text-muted-foreground">New creators added</div>
            </div>
            <div>
              <div className="text-3xl text-muted-foreground mb-1">{importResult.duplicates}</div>
              <div className="text-sm text-muted-foreground">Duplicates skipped</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Imports */}
      <div className="bg-white rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm">Recent imports</h3>
        </div>
        <div className="divide-y divide-border">
          {recentImports.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No imports this session</div>
          ) : (
            recentImports.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm mb-1">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.date}</div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-right">
                    <div className="text-green-600">{item.creatorsAdded}</div>
                    <div className="text-xs text-muted-foreground">Creators added</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">{item.duplicatesSkipped}</div>
                    <div className="text-xs text-muted-foreground">Duplicates skipped</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
