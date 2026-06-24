TARGET FILE: src/app/components/screens/Approvals.tsx — and ONLY this file.
CONTEXT: This screen is the Lead's approval gate. Two new DB columns exist on the creators table: lead_hold (boolean, default false) and lead_hold_note (text). This change fixes three bugs found in audit and converts the broken "pass back to Ops" feature into a real "hold" feature.
THREE FIXES IN ONE CHANGE:
FIX 1 — fetchPushedCreators must split pending vs. already-approved using the DB. Currently it re-fetches all pushed_for_approval=true creators into the pending queue with no awareness of who's already in client_selections, so approved creators wrongly reappear on remount.
FIX 2 — Convert "pass back" into "hold". "Pass back to Ops" currently writes to localStorage (a dead end) and removes the creator from the queue. Replace it: "Hold" writes lead_hold=true + lead_hold_note=<reason> to the creator's DB row, and the creator STAYS in the pending queue marked with a "Held" badge (Ops reads these columns elsewhere). Held creators can still be approved.
FIX 3 — Badge count from the real pending count, not visibleCreators.length - 1.

REPLACE fetchPushedCreators with:
tsconst fetchPushedCreators = async () => {
  if (!activeCampaign) { setVisibleCreators([]); setApprovedCreators([]); return; }

  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .eq("campaign_id", activeCampaign.id)
    .eq("pushed_for_approval", true)
    .order("pushed_at", { ascending: false });
  if (error || !data) { setVisibleCreators([]); setApprovedCreators([]); return; }

  const { data: selections } = await supabase
    .from("client_selections")
    .select("creator_id, client_status")
    .eq("campaign_id", activeCampaign.id);
  const statusByCreator = new Map<string, string>();
  (selections ?? []).forEach((s: any) => statusByCreator.set(s.creator_id, s.client_status ?? "Pending view"));

  const mapOne = (r: any): Creator => ({
    id: r.id,
    name: r.name ?? "",
    handle: r.handle ?? "",
    size: r.size ?? "—",
    tierNum: r.production_tier ?? 0,
    finalPrice: r.final_bid ?? 0,
    marketRateHigh: r.rec_range_high ?? 0,
    contentMatchNum: r.content_match ?? 0,
    audienceFitNum: r.audience_fit ?? 0,
    whyXWRecommends: r.why_xw_recommends ?? "",
    briefFitExplanation: r.audience_match ?? "",
    audienceFitExplanation: r.brief_fit_explanation ?? "",
    opsNotes: r.ops_notes ?? "",
    opsName: r.ops_name ?? "",
    contentQuality: r.why_xw_recommends ?? "",
    briefAlignment: r.audience_match ?? "",
    audienceOverlap: r.brief_fit_explanation ?? "",
    leadHold: r.lead_hold ?? false,
    leadHoldNote: r.lead_hold_note ?? "",
  });

  const pending: Creator[] = [];
  const sent: ApprovedCreator[] = [];
  data.forEach((r: any) => {
    const creator = mapOne(r);
    if (statusByCreator.has(r.id)) {
      sent.push({
        ...creator,
        approvedDate: new Date().toISOString().split('T')[0],
        clientStatus: statusByCreator.get(r.id) as ApprovedCreator["clientStatus"],
      });
    } else {
      pending.push(creator);
    }
  });

  setVisibleCreators(pending);
  setApprovedCreators(sent);
  updateBadgeCount(pending.length);
};
ADD two fields to the Creator interface: leadHold?: boolean; and leadHoldNote?: string;
REPLACE handleConfirmPassBack with handleConfirmHold (and update its caller in the JSX to match the new name):
tsconst handleConfirmHold = async (creator: Creator, e: React.MouseEvent) => {
  e.stopPropagation();
  if (!passBackReason) {
    setPassBackError("Please select a reason before holding");
    return;
  }

  const { error } = await supabase
    .from("creators")
    .update({ lead_hold: true, lead_hold_note: passBackReason })
    .eq("id", creator.id);
  if (error) { setPassBackError("Couldn't hold — try again"); return; }

  setVisibleCreators((prev) =>
    prev.map((c) => c.id === creator.id ? { ...c, leadHold: true, leadHoldNote: passBackReason } : c)
  );
  setToastMessage(`${creator.name} held — ${passBackReason}`);

  setPassBackPopoverId(null);
  setPassBackReason("");
  setPassBackError("");
};
In handleApprove: change the last line from updateBadgeCount(visibleCreators.length - 1); to recompute from the filtered list — replace that line with:
tssetVisibleCreators((prev) => {
  const next = prev.filter((c) => c.id !== creator.id);
  updateBadgeCount(next.length);
  return next;
});
…and REMOVE the now-duplicate setVisibleCreators((prev) => prev.filter((c) => c.id !== creator.id)); line earlier in the function (consolidate into the one above). Keep the rest of handleApprove (the upsert, the setApprovedCreators, the toast) unchanged.
JSX changes (minimal, relabel + badge):

The "Pass Back" column header and the "Pass back" link/button text → "Hold". The popover label "Reason for passing back" → "Reason for hold". The "Confirm pass back" button → "Confirm hold", and its onClick calls handleConfirmHold instead of handleConfirmPassBack.
Keep the reason dropdown options exactly as they are (Price too high / Not the right fit / Brief misalignment / Try renegotiating / Compliance concern / Other).
In the creator's name cell (or row), add a "Held" badge when creator.leadHold is true — e.g. a small pill: {creator.leadHold && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">Held</span>}. Optionally show creator.leadHoldNote on hover/title.

REMOVE the dead pass-back artifacts:

The passedBackCreators state and setPassedBackCreators.
The PassedBackCreator interface.
The entire bottom "passed back" render section (the table with "Pass back reason" header around line 503).
The localStorage write (xw_passed_back_creators).
The passedBackExpanded state if now unused.

DO NOT TOUCH:

handleApproveAll (its upsert is correct).
The role !== "lead" gate, getMarketReference, sortedCreators, totalPendingValue, toggleRow, updateBadgeCount, the click-outside effect, the useEffect calling fetchPushedCreators.
The "Sent to client" / approvedCreators render section.
The expand-row detail section (the isExpanded block showing scoring).
The Approve button and its handleApprove call.
All imports.

DO NOT import/recreate Pipeline.tsx. DO NOT invent columns — lead_hold, lead_hold_note (creators) and creator_id, client_status (client_selections) are the only DB fields touched.
VERIFICATION (state in your output):

fetchPushedCreators splits pending vs. sent via client_selections, and maps lead_hold/lead_hold_note onto each creator.
"Hold" writes lead_hold=true + lead_hold_note to the DB; the creator stays in the pending list with leadHold true (NOT removed).
The "Held" badge renders from creator.leadHold.
All passedBackCreators / PassedBackCreator / localStorage pass-back artifacts are removed.
Badge count derives from the real filtered pending length, not length - 1.
handleApproveAll, the role gate, and the Sent-to-client section are unchanged.