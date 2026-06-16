XW Admin — Pipeline: hydrate scoring panel on reopen + score timestamps + Scored badge. Single file only.
File: src/app/components/screens/Creators.tsx (live pipeline, /pipeline). All changes here.
DO NOT TOUCH: Do not create/recreate Pipeline.tsx. Do not modify scoring.ts or supabase.ts. Do not change tabs, filters, pagination, counters, the ledger boxes, or the four outcome buttons' stage values. Make ONLY the edits below.
Context — saved columns map to panel fields (Option A, already in use): content quality ↔ why_xw_recommends, brief alignment ↔ audience_match, audience overlap ↔ brief_fit_explanation, format fit ↔ category, estimated views ↔ expected_plays, niche tags ↔ niche_tags, risk flag ↔ risk_flag, rec range ↔ rec_range_low/rec_range_high, ops notes ↔ ops_notes, final bid ↔ final_bid. New columns scored_at and re_scored_at (timestamptz) now exist.
EDIT 1 — extend the read mapper in fetchCreators. It already builds the normalised object. Add these fields so saved scoring values and timestamps are available on each creator row (add alongside the existing reads; do not remove any existing line):
js        formatFit: r.category ?? "",
        estimatedViews: r.expected_plays ?? "",
        recRangeLow: r.rec_range_low != null ? String(r.rec_range_low) : "",
        recRangeHigh: r.rec_range_high != null ? String(r.rec_range_high) : "",
        riskFlag: r.risk_flag ?? "",
        scoredAt: r.scored_at ?? null,
        reScoredAt: r.re_scored_at ?? null,
The existing reads (contentQuality: r.why_xw_recommends, briefAlignment: r.audience_match, audienceOverlap: r.brief_fit_explanation, opsNotes: r.ops_notes, niche_tags, finalBidAmount, etc.) stay unchanged.
EDIT 2 — hydrate the panel in openScoringPanel. Currently it always resets scoringData to blank/defaults. Change it so that if the creator already has saved scoring values, those are used; otherwise fall back to the current defaults. Replace the setScoringData({...}) call inside openScoringPanel with:
js    setScoringData({
      contentQuality: creator.contentQuality || "",
      briefAlignment: creator.briefAlignment || "",
      audienceOverlap: creator.audienceOverlap || "",
      nicheTags: Array.isArray(creator.niche_tags) ? creator.niche_tags : [],
      customTagInput: "",
      formatFit: creator.formatFit || "",
      pastBrandDeal: false,
      estimatedViews: creator.estimatedViews || "",
      recRangeLow: creator.recRangeLow || (range ? String(range.low) : ""),
      recRangeHigh: creator.recRangeHigh || (range ? String(range.high) : ""),
      riskFlag: creator.riskFlag || "",
      notes: creator.opsNotes || "",
      finalBidValue: creator.finalBidAmount ? String(creator.finalBidAmount) : (creator.offerAmount ? String(creator.offerAmount) : ""),
    });
Keep the const range = getRecommendedRange(...) line that already precedes this. Leave setDismissedAutoFlags([]) and the rest of the function as-is.
EDIT 3 — stamp timestamps in the payload. In buildScoringPayload, add timestamp logic so the first score stamps scored_at and subsequent re-scores stamp re_scored_at. Add these two fields to the returned object (keep all existing fields unchanged):
js    scored_at: scoringCreator?.scoredAt ?? new Date().toISOString(),
    re_scored_at: scoringCreator?.scoredAt ? new Date().toISOString() : null,
(If the creator was never scored, scored_at is set now and re_scored_at stays null. If already scored, scored_at is preserved and re_scored_at is updated.)
EDIT 4 — "Scored ✓" badge on scored rows. In the Creator column cell, next to the existing "Pushed ✓" badge logic, add a "Scored" badge when the creator has been scored. After the existing {activeTab === 'finalBidSet' && creator.pushedForApproval && (...)} badge span, add:
jsx                              {creator.scoredAt && activeTab !== 'finalBidSet' && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-700 border border-green-200 whitespace-nowrap" title={`Scored ${new Date(creator.scoredAt).toLocaleDateString()}${creator.reScoredAt ? ` · re-scored ${new Date(creator.reScoredAt).toLocaleDateString()}` : ''}`}>
                                  Scored ✓
                                </span>
                              )}
EDIT 5 — show re-score timestamp in the expanded row. In the expanded creator detail (the isExpanded block), after the ops notes line, add a small timestamp line:
jsx                          {creator.scoredAt && (
                            <div className="text-xs text-muted-foreground">
                              Scored {new Date(creator.scoredAt).toLocaleString()}
                              {creator.reScoredAt && ` · last re-scored ${new Date(creator.reScoredAt).toLocaleString()}`}
                            </div>
                          )}
VERIFICATION:

Score a creator (any outcome), then reopen its panel via "Edit scoring →" or the Score/Edit deal button. Expected: all fields show the values you saved, not blank.
Change one field, re-submit. No 400. Reopen — the change persisted.
Scored rows show a green "Scored ✓" badge; hovering shows the scored date (and re-scored date if applicable).
Expand a re-scored creator → see "Scored [date] · last re-scored [date]".
A never-scored creator (stage new) shows no badge and opens the panel with default/blank fields.