CONTEXT — READ FIRST
The live pipeline screen is src/app/components/screens/Creators.tsx (routed as /pipeline). Make ALL changes there. Pipeline.tsx was deleted from the repo — do NOT recreate it, do NOT create any new pipeline file. Do not touch CreatorsOrdered.tsx (that's the Activations screen), scoring.ts, supabase.ts, or any other file.
The Supabase creators table now has a stage text column (values: new, has_bid, scoring, negotiating, final_bid_set, pending_approval, holding) and two new columns pushed_for_approval (boolean) and pushed_at (timestamptz). stage is the single source of truth for which bucket a creator is in. The bid amount lives in the offer column (NOT ask — ask is null for everyone).
SCOPE — DO NOT TOUCH

The data fetch (fetchCreators, the 1000-row pagination loop) — leave exactly as is, only add the new fields to the row mapping.
The bid-range math / getRecommendedRange rendering — leave as is.
The scoring side panel (scoringPanelOpen and everything inside it) — leave as is.
Pagination (100/page Prev/Next) — leave as is.
Search — leave the existing multi-word search logic as is.

CHANGES TO MAKE

Add to the row mapping in fetchCreators (where rows are normalised), these fields read from Supabase:

jsstage: r.stage ?? 'new',
pushedForApproval: r.pushed_for_approval ?? false,

Replace the tab model. The tabs are now exactly these 6, in this order:
All · Creators with bids · Scoring · Negotiating · Final bid set · Holding
plus Silent 48h+ as the 7th pill (it's an overlay, not a stage).

Tab keys → stage filter:

all → show stages new and has_bid and scoring and negotiating and final_bid_set (everything active; exclude holding and pending_approval)
hasBid → stage === 'has_bid'
scoring → stage === 'scoring'
negotiating → stage === 'negotiating'
finalBidSet → stage === 'final_bid_set'
holding → stage === 'holding'
silent → isSilent48h(c) (unchanged)


Counters (the 5 stat cards) must read from the SAME stage filter as the tabs. Compute counts by iterating allCreators once and bucketing on stage. Cards: New (new), Creators with bids (has_bid), Scoring (scoring), Negotiating (negotiating), Final bid set (final_bid_set). Keep the Lifetime count = allCreators.length.
The render MUST map over the filtered+paginated visibleCreators list — never allCreators. Verify every row .map() points at visibleCreators.
Remove the "Status" column and the "Pipeline" dots column entirely from every tab. They're redundant with the tab itself.
Add a "Handle" column to every tab, placed right after Creator. Render creator.handle as a clickable link:

jsx<a href={creator.handle.startsWith('http') ? creator.handle : `https://${creator.handle}`} target="_blank" rel="noopener noreferrer" className="text-[#038B97] hover:underline" onClick={(e) => e.stopPropagation()}>{creator.handle || '—'}</a>

Truncate long creator names: the Creator cell must cap width and ellipsis-truncate, full name on hover:

jsx<TableCell className="max-w-[220px] truncate" title={creator.name}>{creator.name}</TableCell>

In the "Final bid set" tab, if creator.pushedForApproval === true, show a small badge next to the name: Pushed ✓ (teal pill). These creators STAY in the tab — do not remove them.
Action buttons must perform real stage transitions via Supabase update + fetchCreators(), triggered by the Action-column button (NOT the row checkbox). Per tab:


has_bid row → button "Pass to scoring" → update { stage: 'scoring' }; secondary "Waitlist" → update { stage: 'holding' }
scoring row → "Approve for negotiating" → update { stage: 'negotiating', last_contact: new Date().toISOString() }; secondary "Not approved" → update { stage: 'holding' }
negotiating row → "Edit deal" → opens the existing scoring/review panel (keep current behavior)
final_bid_set row → "Push for Lead approval" → update { stage: 'final_bid_set', pushed_for_approval: true, pushed_at: new Date().toISOString() } (stage stays final_bid_set)
holding row → "Re-activate" → update { stage: 'has_bid' }


Column sets per tab:


All: Creator · Handle · Their ask · Stage · Action
Creators with bids: Creator · Handle · Their ask · Rec. Range · Action
Scoring: Creator · Handle · Their ask · Content quality · Brief alignment · Action
Negotiating: Creator · Handle · Their ask · Rec. Range · Last contact · Action
Final bid set: Creator · Handle · Their ask · Final bid · Action (with Pushed ✓ badge)
Holding: Creator · Handle · Their ask · Action
Silent 48h+: Creator · Handle · Their ask · Last contact · Days silent · Action

VERIFICATION (reason about expected data state):
After deploy, with current data (stage: new=6260, has_bid=77, all else 0):

"All" tab shows ~6337 rows. "Creators with bids" shows 77. "Scoring", "Negotiating", "Final bid set", "Holding", "Silent 48h+" all show empty (0 rows, empty table — NOT the same rows as other tabs).
Counters: New 6260, Creators with bids 77, Scoring 0, Negotiating 0, Final bid set 0. Lifetime 6337.
Clicking "Pass to scoring" on a has_bid creator moves them out of Creators with bids and into Scoring, and both counters update.