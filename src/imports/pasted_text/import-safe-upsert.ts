XW Admin — Import 3b: safe upsert (update offers for un-worked creators only) + New/Updated/Skipped counts. Single file only.
File: src/app/components/screens/Import.tsx. All changes here.
DO NOT TOUCH: Do not create/recreate Pipeline.tsx or touch Creators.tsx, scoring.ts, supabase.ts, sheetsApi.ts, CampaignContext. Keep the existing imports-logging, fetchRecentImports, label-generation, the two cards UI, and the upload-CSV card. Only rewrite the import write logic inside handleSheetImport and update the result/history display to show Updated.
Context: creators has a unique key (campaign_id, normalized_handle). Stages: new, has_bid, negotiating, final_bid_set, waitlisted, not_qualified. The imports table now has an updated_count int column. Rule: re-import may only refresh the offer of creators whose stage is new or has_bid (un-worked). Creators in negotiating/final_bid_set/waitlisted/not_qualified are Ops-owned and must NOT be touched. A new-stage creator who gains an offer (>0) should be promoted to has_bid.
EDIT 1 — replace the upsert section of handleSheetImport. Find the block that builds toUpsert, runs the batched upsert with ignoreDuplicates: true, computes duplicates, and stops before the label-generation. Replace from the const toUpsert = rows.flatMap(...) line through the const duplicates = validRows - totalInserted; line with this partition-based logic:
js      // Build clean sheet rows (skip blank handles)
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
EDIT 2 — update the imports insert to log updated_count. In the supabase.from("imports").insert({...}) call, add one field:
js        net_new_count: totalInserted,
        updated_count: totalUpdated,
        duplicates_skipped: duplicates,
(Add the updated_count: totalUpdated, line; keep the others.)
EDIT 3 — result card shows three numbers. Change the setImportResult call to include updated:
js      setImportResult({ newCreators: totalInserted, updated: totalUpdated, duplicates });
And update the importResult state type and the Import Complete card. Change the state type:
js  const [importResult, setImportResult] = useState<{ newCreators: number; updated: number; duplicates: number } | null>(null);
Change the Import Complete card from a 2-column grid to 3 columns showing New / Updated / Skipped:
jsx          <div className="grid grid-cols-3 gap-6">
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
EDIT 4 — recent-imports history shows Updated. Add updated_count to the RecentImport interface:
js  net_new_count: number;
  updated_count: number;
  duplicates_skipped: number;
And in the recent-imports .map(...), add an Updated column between New and In file:
jsx                  <div className="text-right">
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
VERIFICATION:

Import once. New creators insert; existing un-worked creators with a changed offer get updated; result card shows New / Offers updated / Skipped.
In the sheet, change the Offer for one creator who is currently in Bids to score (has_bid). Re-import → that creator's offer updates (verify in Pipeline), Updated count = 1.
Change the Offer for one creator in Negotiating. Re-import → that creator's offer is unchanged (Ops-owned, protected); they fall into Skipped.
A creator in stage new with no offer who now has an offer in the sheet → after import, appears in Bids to score (has_bid) with the offer. (Promotion works.)
Recent imports history row shows New / Updated / In file / Skipped, persists on reload.
SQL check: select import_label, net_new_count, updated_count, duplicates_skipped from imports order by imported_at desc limit 3;