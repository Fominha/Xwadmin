XW Admin — Pipeline: fix scoring write (PGRST204 phantom columns + type mismatches) and handle link. Single file only.
File: src/app/components/screens/Creators.tsx (live pipeline, routed /pipeline). All changes here.
DO NOT TOUCH: Do not create or recreate Pipeline.tsx (deleted on purpose). Do not modify src/app/lib/scoring.ts or src/app/lib/supabase.ts (keep its || 'placeholder' fallback). Do not change the tabs, counters, filter logic, pagination, the scoring panel UI, scoringComplete/finalBidValid validation, or any handler other than the three edits below. Make ONLY these three edits.
Real creators columns (verified — do not write any column not in this list): id, campaign_id, name, handle, followers, platform, niche_tags, bio, avatar_url, ask, offer, final_bid, production_tier(int), content_match(int), audience_fit(int), expected_plays(text), engagement, watch_time, audience_match(text), match_strength(text), risk_flag(text), ops_notes(text), why_xw_recommends, brief_fit_explanation(text), audience_fit_explanation, created_at, email, category(text), score, bid, status, pushed_at, normalized_handle, last_contact, stage, pushed_for_approval, rec_range_low(numeric), rec_range_high(numeric). There is NO updated_at, NO rec_range, NO days_silent column.
EDIT 1 — replace buildScoringPayload entirely. Current version writes phantom columns (rec_range, updated_at) and writes text into int columns (content_match, production_tier). Replace the whole function with this, which writes only real text/numeric columns:
jsconst buildScoringPayload = () => ({
  match_strength: scoringData.contentQuality || null,
  audience_match: scoringData.briefAlignment || null,
  brief_fit_explanation: scoringData.audienceOverlap || null,
  category: scoringData.formatFit || null,
  expected_plays: scoringData.estimatedViews || null,
  niche_tags: scoringData.nicheTags,
  risk_flag: scoringData.riskFlag || null,
  rec_range_low: scoringData.recRangeLow ? Number(scoringData.recRangeLow) : null,
  rec_range_high: scoringData.recRangeHigh ? Number(scoringData.recRangeHigh) : null,
  ops_notes: scoringData.notes || null,
});
Do not add updated_at. Do not write content_match, audience_fit, or production_tier (those are integer columns and the panel collects text). The four outcome handlers that spread this payload and add stage/last_contact/final_bid stay exactly as they are.
EDIT 2 — fix the read mapper inside fetchCreators (the data.map(...) block). It currently reads phantom columns. Make these line replacements inside the normalised object, leaving every other line unchanged:
Replace:
js        lastContact: r.last_contact
          ? new Date(r.last_contact).toLocaleDateString()
          : r.updated_at
            ? new Date(r.updated_at).toLocaleDateString()
            : "—",
        contentQuality: r.content_match ?? "",
        briefAlignment: r.content_match ?? "",
        audienceOverlap: r.audience_fit ?? "",
        recRange: r.rec_range ?? "",
        daysSilent: r.days_silent ?? 0,
with:
js        lastContact: r.last_contact
          ? new Date(r.last_contact).toLocaleDateString()
          : "—",
        contentQuality: r.match_strength ?? "",
        briefAlignment: r.audience_match ?? "",
        audienceOverlap: r.brief_fit_explanation ?? "",
        recRange: r.rec_range_low && r.rec_range_high ? `$${r.rec_range_low}–$${r.rec_range_high}` : "",
        daysSilent: 0,
Leave the rest of the mapper (id, name, handle, followers, theirAsk, offerAmount, ask, finalBidAmount, finalBid, status, stage, pushedForApproval, last_contact, opsNotes, production_tier, content_match, audience_fit, niche_tags) unchanged.
EDIT 3 — handle link → Instagram. Creators store only a slug in handle (e.g. karolinalarion); platform is 'instagram'. The current href does https://${creator.handle} which produces a bare slug → DNS error. In the Handle column's <a>, replace:
js                              href={creator.handle?.startsWith('http') ? creator.handle : `https://${creator.handle}`}
with:
js                              href={creator.handle?.startsWith('http') ? creator.handle : `https://instagram.com/${creator.handle}`}
Keep target="_blank", rel, classes, and display text unchanged.
VERIFICATION (do after deploy, reason about state):

/pipeline → Bids to score (should be ~68). Open one creator's scoring panel, fill all required fields, click Approve for negotiating. Expected: NO 400/PGRST204 in console; creator leaves Bids to score; Negotiating counter +1; row appears in Negotiating tab with the rec range shown.
On three other creators test Waitlist (Waitlisted +1), Not qualified (Not qualified +1), and Approve as final bid with a final bid entered (Final bid set +1, and final_bid persists / shows in Final bid column).
Expand a scored creator's row → the Content quality / Brief alignment / Audience overlap chips show the labels you selected (proves the read mapper points at the right text columns).
Click any handle → opens https://instagram.com/<slug> in a new tab, no DNS error.
Bids to score count dropped by exactly the number of creators moved.