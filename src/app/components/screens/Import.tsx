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
  id: string;
  import_label: string;
  imported_at: string;
  net_new_count: number;
  updated_count: number;
  duplicates_skipped: number;
  rows_in_file: number;
  imported_by: string | null;
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
  const [importResult, setImportResult] = useState<{ newCreators: number; updated: number; duplicates: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [recentImports, setRecentImports] = useState<RecentImport[]>([]);

  const fetchRecentImports = async () => {
    if (!activeCampaign) { setRecentImports([]); return; }
    const { data } = await supabase
      .from("imports")
      .select("*")
      .eq("campaign_id", activeCampaign.id)
      .order("imported_at", { ascending: false })
      .limit(10);
    setRecentImports(data ?? []);
  };

  useEffect(() => {
    fetchRecentImports();
  }, [activeCampaign?.id]);

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

      // Build clean sheet rows (skip blank handles)
      const sheetRows = rows.flatMap(row => {
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
        }];
      });

      const validRows = sheetRows.length;

      // Fetch existing creators for this campaign to partition new vs existing
      const existingMap = new Map<string, { id: string; stage: string; offer: number | null }>();
      {
        const PAGE = 1000;
        let off = 0;
        while (true) {
          const { data, error } = await supabase
            .from("creators")
            .select("id, normalized_handle, stage, offer")
            .eq("campaign_id", campaignId)
            .range(off, off + PAGE - 1);
          if (error) { setImportError(error.message); return; }
          if (!data || data.length === 0) break;
          for (const c of data) existingMap.set(c.normalized_handle, { id: c.id, stage: c.stage, offer: c.offer });
          if (data.length < PAGE) break;
          off += PAGE;
        }
      }

      // Partition
      const toInsert: any[] = [];
      const toUpdate: { id: string; offer: number | null; promote: boolean }[] = [];
      let skipped = 0;

      for (const r of sheetRows) {
        const existing = existingMap.get(r.normalized_handle);
        if (!existing) {
          toInsert.push({ ...r, status: "New", created_at: new Date().toISOString() });
        } else if (existing.stage === "new" || existing.stage === "has_bid") {
          const offerChanged = (existing.offer ?? null) !== (r.offer ?? null);
          const promote = existing.stage === "new" && r.offer != null && r.offer > 0;
          if (offerChanged || promote) {
            toUpdate.push({ id: existing.id, offer: r.offer, promote });
          } else {
            skipped++;
          }
        } else {
          // negotiating / final_bid_set / waitlisted / not_qualified — Ops-owned, do not touch
          skipped++;
        }
      }

      // Insert new creators in batches
      const BATCH_SIZE = 1000;
      let totalInserted = 0;
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from("creators")
          .upsert(batch, { onConflict: "campaign_id,normalized_handle", ignoreDuplicates: true })
          .select("id");
        if (error) { setImportError(error.message); return; }
        totalInserted += data?.length ?? 0;
      }

      // Update offers for un-worked creators (and promote new->has_bid where applicable)
      let totalUpdated = 0;
      for (const u of toUpdate) {
        const patch: any = { offer: u.offer };
        if (u.promote) patch.stage = "has_bid";
        const { error } = await supabase.from("creators").update(patch).eq("id", u.id);
        if (error) { setImportError(error.message); return; }
        totalUpdated++;
      }

      const duplicates = skipped;

      // Generate unique label: {campaignName}-import-{YYYY-MM-DD}-{n}
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const startOfDay = new Date(yyyy, today.getMonth(), today.getDate()).toISOString();

      // Count today's imports for this campaign to get the sequence number
      const { count: todayCount } = await supabase
        .from("imports")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .gte("imported_at", startOfDay);

      const seq = (todayCount ?? 0) + 1;
      const rawName = (activeCampaign.client ?? activeCampaign.name ?? "campaign").toString();
      // Take the part before any separator (— - | :), trim, strip spaces and unsafe chars
      const slug = rawName
        .split(/[—\-|:]/)[0]
        .trim()
        .replace(/\s+/g, "")
        .replace(/[^a-zA-Z0-9]/g, "") || "campaign";
      const importLabel = `${slug}-import-${dateStr}-${seq}`;

      const currentUser = getCurrentUser();

      await supabase.from("imports").insert({
        campaign_id: campaignId,
        import_label: importLabel,
        file_name: "Latest_Export (Google Sheet)",
        source: "sheet",
        rows_in_file: validRows,
        net_new_count: totalInserted,
        updated_count: totalUpdated,
        duplicates_skipped: duplicates,
        imported_by: currentUser?.email ?? currentUser?.name ?? "ops",
      });

      setImportResult({ newCreators: totalInserted, updated: totalUpdated, duplicates });
      await fetchRecentImports();
    } catch (err: any) {
      setImportError(err?.message ?? "Import failed — check the sheet connection.");
    } finally {
      setImporting(false);
    }
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
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-3xl text-[#038B97] mb-1">{importResult.newCreators}</div>
              <div className="text-sm text-muted-foreground">New creators added</div>
            </div>
            <div>
              <div className="text-3xl text-amber-600 mb-1">{importResult.updated}</div>
              <div className="text-sm text-muted-foreground">Offers updated</div>
            </div>
            <div>
              <div className="text-3xl text-muted-foreground mb-1">{importResult.duplicates}</div>
              <div className="text-sm text-muted-foreground">Skipped</div>
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
            <div className="p-4 text-sm text-muted-foreground text-center">No imports yet for this campaign</div>
          ) : (
            recentImports.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm mb-1">{item.import_label}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.imported_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    {item.imported_by ? ` · ${item.imported_by}` : ""}
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-right">
                    <div className="text-green-600">{item.net_new_count}</div>
                    <div className="text-xs text-muted-foreground">New</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-600">{item.updated_count ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Updated</div>
                  </div>
                  <div className="text-right">
                    <div className="text-foreground">{item.rows_in_file}</div>
                    <div className="text-xs text-muted-foreground">In file</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">{item.duplicates_skipped}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
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
