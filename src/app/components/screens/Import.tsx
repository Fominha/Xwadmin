import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Upload, ArrowRight, FileSpreadsheet } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { getCurrentUser } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { fetchLatestExport } from "../../lib/sheetsApi";

export function Import() {
  const navigate = useNavigate();
  const campaignId = localStorage.getItem("xw_campaign_id");

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role !== "ops") {
      navigate("/dashboard");
    }
  }, [navigate]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

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
          setImportResult({
            newCreators: 124,
            duplicates: 18,
            inNegotiation: 47,
          });
        }
      }, 200);
    }
  };

  const handleSheetImport = async () => {
    setImporting(true);
    try {
      // 1. Fetch campaign's sheet_id from Supabase
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("sheet_id")
        .eq("id", campaignId)
        .single();

      if (campaignError || !campaign) throw new Error("Campaign not found");

      // 2. Fetch Latest_Export tab from Google Sheets
      const rows = await fetchLatestExport(campaign.sheet_id);

      // 3. Get existing creator handles for this campaign
      const { data: existing } = await supabase
        .from("creators")
        .select("handle")
        .eq("campaign_id", campaignId);

      const existingHandles = new Set(existing?.map((c: any) => c.handle) ?? []);

      // 4. Filter net new
      const netNew = rows.filter(row => !existingHandles.has(row["Handle"] ?? row["handle"]));

      // 5. Insert net new into Supabase creators table
      if (netNew.length > 0) {
        await supabase.from("creators").insert(
          netNew.map(row => ({
            campaign_id: campaignId,
            handle: row["Handle"] ?? row["handle"],
            name: row["Name"] ?? row["name"] ?? "",
            followers: parseInt(row["Followers"] ?? "0"),
            category: row["Category"] ?? row["category"] ?? "",
            email: row["Email"] ?? row["email"] ?? "",
            status: "New",
            created_at: new Date().toISOString(),
          }))
        );
      }

      setImportResult({
        newCreators: netNew.length,
        duplicates: rows.length - netNew.length,
        inNegotiation: 0,
      });
    } catch (err) {
      console.error("Import failed:", err);
      setImportResult({ newCreators: 0, duplicates: 0, inNegotiation: 0 });
    } finally {
      setImporting(false);
    }
  };

  const recentImports = [
    { batch: "Batch 10", date: "Apr 22, 2026 - 2:15 PM", creatorsAdded: 124, duplicatesSkipped: 18 },
    { batch: "Batch 9", date: "Apr 21, 2026 - 4:30 PM", creatorsAdded: 89, duplicatesSkipped: 12 },
    { batch: "Batch 8", date: "Apr 20, 2026 - 11:20 AM", creatorsAdded: 156, duplicatesSkipped: 23 },
  ];

  return (
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
              disabled={importing}
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
              <div className="text-3xl text-muted-foreground mb-1">{importResult.duplicates}</div>
              <div className="text-sm text-muted-foreground">Duplicates skipped</div>
            </div>
            <div>
              <div className="text-3xl text-[#038B97] mb-1">{importResult.inNegotiation}</div>
              <div className="text-sm text-muted-foreground">Now in negotiation</div>
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
          {recentImports.map((importItem, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm mb-1">{importItem.batch}</div>
                <div className="text-xs text-muted-foreground">{importItem.date}</div>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-right">
                  <div className="text-green-600">{importItem.creatorsAdded}</div>
                  <div className="text-xs text-muted-foreground">Creators added</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">{importItem.duplicatesSkipped}</div>
                  <div className="text-xs text-muted-foreground">Duplicates skipped</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
