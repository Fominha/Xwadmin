XW Admin — Import: persist import history to a new imports table + show real recent-imports list. Single file only.
File: src/app/components/screens/Import.tsx (the Import tab). All changes here.
DO NOT TOUCH: Do not create/recreate Pipeline.tsx or touch Creators.tsx. Do not modify scoring.ts, supabase.ts, sheetsApi.ts, or CampaignContext. Do not change the upsert behavior or the toUpsert mapping (that's a separate later step). Only add import-history persistence and rewire the recent-imports UI to read from the database.
Context: A new Supabase table imports exists with columns: id, campaign_id, import_label (text), file_name (text), source (text), rows_in_file (int), net_new_count (int), duplicates_skipped (int), imported_by (text), imported_at (timestamptz default now()). The current import already computes totalInserted (net new) and duplicates. We persist a row per import and read history back from this table per campaign.
EDIT 1 — fix the duplicate count. Currently const duplicates = totalRows - totalInserted; overstates duplicates because totalRows includes blank-handle rows that were filtered out. Change it to count only valid (non-blank-handle) rows. Replace:
js      const duplicates = totalRows - totalInserted;
with:
js      const validRows = toUpsert.length;
      const duplicates = validRows - totalInserted;
and use validRows (not totalRows) as the "rows in file" value going forward.
EDIT 2 — after a successful import, write a row to imports with a generated unique label. Replace the existing success block:
js      const duplicates = totalRows - totalInserted;
      setImportResult({ newCreators: totalInserted, duplicates });
      addRecentImport(totalInserted, duplicates);
with:
js      const validRows = toUpsert.length;
      const duplicates = validRows - totalInserted;

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
      const campaignName = (activeCampaign.name ?? activeCampaign.client ?? "campaign").toString().replace(/\s+/g, "");
      const importLabel = `${campaignName}-import-${dateStr}-${seq}`;

      const currentUser = getCurrentUser();

      await supabase.from("imports").insert({
        campaign_id: campaignId,
        import_label: importLabel,
        file_name: "Latest_Export (Google Sheet)",
        source: "sheet",
        rows_in_file: validRows,
        net_new_count: totalInserted,
        duplicates_skipped: duplicates,
        imported_by: currentUser?.email ?? currentUser?.name ?? "ops",
      });

      setImportResult({ newCreators: totalInserted, duplicates });
      await fetchRecentImports();
EDIT 3 — replace the session-only recent-imports state with a DB fetch. The current recentImports is in-memory and addRecentImport only updates local state, so it's lost on refresh. Replace the RecentImport interface and the addRecentImport function with a fetch from the imports table.
Replace the interface:
jsinterface RecentImport {
  label: string;
  date: string;
  creatorsAdded: number;
  duplicatesSkipped: number;
}
with:
jsinterface RecentImport {
  id: string;
  import_label: string;
  imported_at: string;
  net_new_count: number;
  duplicates_skipped: number;
  rows_in_file: number;
  imported_by: string | null;
}
Remove the addRecentImport function entirely. Add a fetchRecentImports function and call it on mount and when the campaign changes:
js  const fetchRecentImports = async () => {
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
EDIT 4 — update the Recent imports JSX to render the DB fields. Replace the recentImports.map(...) block so it reads the new field names and shows label, date, who imported, net-new, rows-in-file, and duplicates:
jsx            recentImports.map((item) => (
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
Also update the empty-state text from "No imports this session" to "No imports yet for this campaign".
VERIFICATION:

Run an import from the sheet. After it completes, the Recent imports list shows a row labeled like Fundify-import-2026-06-16-1 with the date, who imported, New count, In-file count, and Skipped count.
Reload the page. The import history is still there (persisted, not session-only) — this is the core fix.
Run a second import the same day → label increments to ...-2.
In Supabase, select * from imports order by imported_at desc limit 5; shows the logged rows.
Switch to a different campaign → recent imports list shows only that campaign's history (or empty).