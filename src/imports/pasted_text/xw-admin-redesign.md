Redesign the XW Admin app from the ground up based on the following specification. Keep the exact same visual design system (teal #038B97, sidebar, table styles, card styles) but restructure the navigation, screens, and data model completely.

ROLE SYSTEM — Two login modes
Add a role selector to the login/connect screen. Two roles:

Marlen (password: set from env) — Operations. Sees: Dashboard, Brief, Import, Creators, Ready for Julio
Julio (password: set from env) — Director. Sees: Dashboard, Approvals, Orders, Brief

Store the active role in localStorage. Show the active role name in the top right of the sidebar (small gray pill). Add a "Switch role" link below it.

NAVIGATION — Simplify from 8 items to 6
Replace the current navigation with:
Marlen's sidebar:

Dashboard
Brief
Import
Creators (replaces Pipeline + Qualify + Negotiate — all in one)
Ready for Julio (count badge — creators Marlen has approved)
Orders

Julio's sidebar:

Dashboard
Approvals (count badge — Marlen's approved list)
Orders
Brief


SCREEN 1 — Dashboard (role-aware)
Marlen's dashboard:
Top card: Campaign name, client, budget bar (committed / MSA total), posting window, days until supply chain closes (amber pill if under 14 days, red if under 7).
Below that, a "Needs your attention" section with three columns:

🔴 Act now — creators with new bids not yet scored, counter-offers waiting for Marlen's reply, creators silent for 48+ hours (show count + teal "Review" button)
🟡 Waiting on creator — Marlen has sent counter, awaiting response (show count + last contact date)
🟢 Ready for Julio — scored + final bid set, pending Julio approval (show count)

Below that, pipeline health strip (smaller than before, 4 cards only):

Bids received · Being scored · In negotiation · Final bid set

Julio's dashboard:
Top card: same campaign card as Marlen.
Below: "Pending your approval" — a list of creators Marlen has marked ready, showing name, handle, tier label, final price, content match label, audience fit label. Two buttons per row: "Pass back to Marlen" · "Approve →" (teal).
Below that: Budget committed card showing confirmed spend vs MSA, with a progress bar.

SCREEN 2 — Brief
Keep exactly as built in Version 5. No changes needed.

SCREEN 3 — Import (Marlen only)
Two import options shown as two cards side by side:
Card 1 — Upload CSV:
Dashed upload zone. "Drop CSV export from XW App here or click to upload." Supports .csv files. Shows upload progress. After import shows: X new creators added · X duplicates skipped · X now in negotiation (had offers).
Card 2 — Import from Sheet:
"Import from Latest_Export tab." Single teal button "Import from Latest_Export →". Reads the Latest_Export tab from the connected Google Sheet directly. Same result summary after import.
Below both cards: Recent imports section showing last 3 batches (batch label, date, creators added in green, duplicates skipped in gray).

SCREEN 4 — Creators (Marlen only — replaces Pipeline + Qualify + Negotiate)
This is Marlen's main worklist. One unified table of all creators who have submitted a bid (Offer > 0 OR Internal Status = negotiating). Creators without bids are not shown here.
Top bar:

Page title "Creators" with subtitle "Manage bids, scoring and negotiation"
Search input "Search by name or handle…"
Filter chips: All · New bid · Scoring · Negotiating · Final bid set · Silent 48h+
Batch actions (appear when rows checked): "Send follow-up" · "Mark final bid"

Table columns:
Creator · Handle · Followers · Size · Their Ask · Rec. Range · Status · Last Contact · Action
Status values (clear plain English, not codes):

"New bid" — amber pill — offer received, not yet scored
"Scoring" — blue pill — Marlen is reviewing
"Negotiating" — teal pill — back and forth in progress
"Counter sent" — gray pill — waiting on creator
"Silent 48h+" — red pill — no response in 48 hours
"Final bid set" — green pill — ready for Julio

Action column (contextual per status):

New bid → "Score & review →" button
Scoring → "Continue scoring →"
Negotiating → "Send counter →"
Counter sent → "Follow up →"
Silent 48h+ → "Follow up →" (red border)
Final bid set → "Send to Julio →"

Clicking any row opens an expanded side panel (not a new page) with 3 tabs:
Tab 1 — Profile:
Creator name, handle, Instagram link, followers, size (nano/micro/mid-tier), categories, country, gender, email, phone. Read-only.
Tab 2 — Score:
Only enabled after a bid is received. Three scoring sections, each with a segmented button (1-5) AND a descriptive label that updates as you click:
Production Tier:

1 = Raw — shaky cam, no structure
2 = Emerging — improving, uneven
3 = Practiced — reliable, brand-safe
4 = Fluent — polished, ad-ready
5 = Studio — broadcast quality

Content Match (fit against campaign brief):

1 = Off brief entirely
2 = Loosely related
3 = On topic, average fit
4 = Strong fit
5 = Perfect match

Audience Fit (demographic alignment):

1 = Wrong demographic
2 = Partial overlap
3 = Decent match
4 = Strong alignment
5 = Ideal audience

Also show: XW Category 1 (dropdown), XW Category 2 (dropdown), Notes (textarea).
Save button: "Save scores" (gray). When all three scores are set: "Save & move to negotiation →" (teal).
Tab 3 — Negotiate:
Shows: Their ask · Recommended range (teal, calculated from NEG_TIERS formula) · Counter offer input · Status dropdown (Pending Review / Negotiating / Ready to Score) · Notes · "Lock final bid →" (amber) · "Send to Julio for approval →" (teal, only shows when final bid is locked).
Below: a simple timeline of actions — "Bid received Apr 21 · Counter sent Apr 22 · Creator responded Apr 23"

SCREEN 5 — Ready for Julio (Marlen) / Approvals (Julio)
Marlen's view — "Ready for Julio":
Table of creators she has marked ready. Columns: Creator · Handle · Tier (with full label e.g. "Tier 4 — Fluent") · Final Price · Content Match (label, not score) · Audience Fit (label, not score) · Sent to Julio (timestamp or "Not yet sent"). Button per row: "Send to Julio →" (teal). Batch checkbox + "Send all selected →" button at top.
Julio's view — "Approvals":
Same table. Columns: Creator · Handle · Tier label · Final Price · Content Match label · Audience Fit label · Marlen's notes. Two buttons per row: "Pass back →" (ghost) · "Approve & push to client →" (teal). Approved creators automatically write to Client_Selections tab in Google Sheet.

SCREEN 6 — Orders (both roles)
Keep exactly as built in Version 5. Add "Sync from sheet" button top right that re-reads Campaign_Orders tab. Add payment status summary bar at bottom: X Paid · X Invoiced · X Unpaid · X Overdue.

SCORING DISPLAY — Fix everywhere scores appear
Replace all instances of "T4 C5 A4" style badges with readable labels:

Instead of "T4" show "Tier 4 — Fluent"
Instead of "C5" show "Content — Perfect match"
Instead of "A4" show "Audience — Strong alignment"
In compact table views use shortened form: "Fluent · Perfect · Strong"

In Push to Client / Approvals table: replace "5/5" scores with the label text. "5/5 content match" becomes "Perfect match". "4/5 audience fit" becomes "Strong alignment".

NEG_TIERS FORMULA — Recommended range calculation
When showing recommended range in the Negotiate tab, calculate it client-side using this formula:

Ask ≤ $500: recommend 60–80% of ask
Ask ≤ $800: recommend 50–60% of ask
Ask ≤ $1,500: recommend 40–60% of ask
Ask ≤ $3,000: recommend 40–50% of ask
Ask ≤ $7,000: recommend 30–50% of ask
Ask > $7,000: recommend 25–40% of ask
> Round to nearest 50.Displayas"50. Display as "
50.Displayas"X–$Y" in teal.



LOADING AND ERROR STATES
Every screen that loads data shows:

A centered small teal spinner with label "Loading…" while fetching
A gray card "Could not load data — check your sheet connection" with a "Retry" button if fetch fails
Empty state with icon and message if data loads but is empty (e.g. "No bids received yet — import creators to get started")


GLOBAL FIXES

Dashboard is always the home/default page, not Brief
Sidebar always visible on desktop (not cut off in preview)
"Connected to campaign sheet" indicator stays in top bar with sheet name
"Disconnect" button stays top right