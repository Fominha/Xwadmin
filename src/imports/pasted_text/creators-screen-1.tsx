CONTEXT — READ FIRST
The live pipeline screen is src/app/components/screens/Creators.tsx (routed as /pipeline). Make ALL changes there. Pipeline.tsx was deleted from the repo — do NOT recreate it or create any new pipeline file. Do not touch CreatorsOrdered.tsx, scoring.ts, supabase.ts, or any other file.
The creators table uses a stage text column as the single source of truth. Valid values: new, has_bid, negotiating, final_bid_set, pending_approval, waitlisted, not_qualified. The bid amount is in the offer column; the final bid is written to the final_bid column. The scoring stage no longer exists — it has been removed from the model.
SCOPE — DO NOT TOUCH

The data fetch (fetchCreators, the 1000-row pagination loop). Only add fields to the row mapping as noted.
The bid-range math / getRecommendedRange rendering.
Pagination, search, the Handle column, name truncation, the Silent 48h+ overlay — all stay as they are.
The Final bid set tab's "Pushed ✓" behavior and "Push for Lead approval" action — leave as is.
Negotiating tab behavior — leave as is.

CHANGES TO MAKE

Remove the "Scoring" tab and its counter card entirely. No scoring stage anywhere. The tab set is now exactly:
All · Bids to score · Negotiating · Final bid set · Waitlisted · Not qualified + Silent 48h+ overlay pill.
Rename the has_bid tab label to "Bids to score" (the stage value stays has_bid — label change only).


Tab filters: all shows stages new, has_bid, negotiating, final_bid_set (exclude waitlisted/not_qualified/pending_approval); bidsToScore → stage === 'has_bid'; negotiating → stage === 'negotiating'; finalBidSet → stage === 'final_bid_set'; waitlisted → stage === 'waitlisted'; notQualified → stage === 'not_qualified'; silent → isSilent48h(c).


Counter cards read from the same stage buckets: New (new), Bids to score (has_bid), Negotiating (negotiating), Final bid set (final_bid_set), Silent 48h+ (isSilent48h). Add two more small counts somewhere visible (can be alongside Lifetime): Waitlisted (waitlisted), Not qualified (not_qualified). Lifetime = allCreators.length.
Add to the fetchCreators row mapping (alongside existing fields):

jsofferAmount: r.offer ?? 0,
(keep stage, pushedForApproval, and existing fields as they are).

Bids to score tab — single row action. Each row's Action column has ONE button: "Score". Clicking it opens the existing scoring side panel for that creator (same panel currently opened by the scoring flow). No other buttons on these rows.
Scoring side panel — replace the footer. Remove the existing single "Save" button. The panel can ONLY be closed by Cancel or one of four outcome actions. New footer:


Cancel (top-left or as X) — discards changes, closes, creator stays has_bid, writes nothing.
Four outcome buttons, each performs a Supabase update on the creator's id then await fetchCreators() then closes the panel:

Waitlist → update { ...scoringFields, stage: 'waitlisted' }
Not qualified → update { ...scoringFields, stage: 'not_qualified' }
Approve for negotiating → update { ...scoringFields, stage: 'negotiating', last_contact: new Date().toISOString() }
Approve as final bid → update { ...scoringFields, stage: 'final_bid_set', final_bid: <finalBidValue> }

...scoringFields = the same content_match / audience_fit / niche_tags / production_tier / rec_range / ops_notes fields the panel already saves. (Reuse the existing save payload; just add stage and, for the final-bid action, final_bid.)


Add a "Final bid" input field near the bottom of the scoring panel (after the rec-range section). It's a number input, pre-filled with the creator's offer amount when the panel opens. Only the "Approve as final bid" action reads it.


The "Approve as final bid" button is disabled while this field is empty/zero. When disabled and the field is empty, show inline helper text under the field: "Enter a final bid to approve." No popup/modal.
The other three outcome buttons ignore this field and are always enabled.


Waitlisted and Not qualified tabs — each row has a "Re-activate" button in the Action column → update { stage: 'has_bid' } then fetchCreators(). This returns them to Bids to score.
Column sets per tab:


All: Creator · Handle · Their ask · Stage · Action
Bids to score: Creator · Handle · Their ask · Rec. Range · Action (Score)
Negotiating: Creator · Handle · Their ask · Rec. Range · Last contact · Action
Final bid set: Creator · Handle · Their ask · Final bid · Action (with Pushed ✓ badge, unchanged)
Waitlisted: Creator · Handle · Their ask · Action (Re-activate)
Not qualified: Creator · Handle · Their ask · Action (Re-activate)
Silent 48h+: Creator · Handle · Their ask · Last contact · Days silent · Action

VERIFICATION (reason about expected data state):
Current data: new=6260, has_bid=77, all other stages 0.

"All" shows ~6337. "Bids to score" shows 77. Negotiating, Final bid set, Waitlisted, Not qualified, Silent 48h+ all show empty tables (0 rows — not the same rows as other tabs).
Counters: New 6260, Bids to score 77, Negotiating 0, Final bid set 0, Silent 0; Waitlisted 0, Not qualified 0; Lifetime 6337.
Open a Bids-to-score creator via "Score" → panel opens, Final bid field pre-filled with their offer. Click "Approve for negotiating" → creator leaves Bids to score (now 76), appears in Negotiating (now 1). Score another, click "Approve as final bid" with the field filled → appears in Final bid set with final_bid written. Click "Not qualified" on a third → appears in Not qualified tab. Each transition persists in Supabase stage.
Confirm the panel cannot be closed without Cancel or an outcome button (no plain Save remains).

