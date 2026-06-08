# XW Admin — Build Synopsis
**Version:** Alpha (internal use)
**Last updated:** 2026-06-08
**Audience:** New developers onboarding to this project

---

## 1. Overview

XW Admin is a web-based internal operations tool for **Xrossworld**, a UGC creator agency. It is used by 2–3 internal operators across two roles — **Ops** and **Lead** — to manage creator campaigns from sourcing through client delivery.

The app replaces manual spreadsheet coordination with a structured workflow tool that tracks creators through a multi-stage pipeline: import → score → negotiate → approve → activate → pay.

**Current status:** Alpha. All major screens are built and functional with mock data. Google Sheets integration is architected but not live. No real backend or database is connected.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18.3.1 (via Vite 6.3.5) |
| Language | TypeScript |
| Routing | React Router 7.13.0 |
| Styling | Tailwind CSS 4.1.12 + CSS custom properties |
| UI Components | shadcn/ui (Radix UI primitives) |
| Charts | Recharts |
| Animation | Motion (motion/react) |
| Notifications | Sonner (toast) |
| Icons | Lucide React |
| State | Local component state (useState) + localStorage for persistence |
| Data | Mock API (mockApi.ts) simulating Google Sheets |
| Auth | Hardcoded passwords + localStorage session |

**No backend server. No database. No live API.** All data is mocked in `src/app/lib/mockApi.ts`.

---

## 3. Brand & Design Tokens

Defined in `src/styles/theme.css`.

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#038B97` | Teal — primary actions, links, active states |
| `--secondary` | `#E3FF27` | Acid yellow — accent, highlights |
| `--background` | `#F4F4F2` | Page background |
| `--foreground` | Dark | Body text |
| `--muted` | Subtle gray | Secondary text, borders |

Design aesthetic: Linear/Retool-style — functional, dense, table-driven. Not a consumer app.

---

## 4. Authentication

**File:** `src/app/lib/auth.ts`

| Role | Password | Access |
|---|---|---|
| `ops` | `ops123` | Dashboard, Brief (edit), Import, Pipeline, Activations |
| `lead` | `lead123` | Dashboard, Brief (read-only), Approvals, Orders |

**Flow:**
1. User selects role on `/login`, enters password
2. `authenticateUser(role, password)` validates against hardcoded passwords
3. Role stored in `localStorage` as `xw_user_role`
4. `getCurrentUser()` reads localStorage on every render
5. RootLayout redirects to `/login` if no user, `/connect` if no sheet connected

**Functions:**
- `authenticateUser(role, password)` → `User | null`
- `getCurrentUser()` → `User | null`
- `setCurrentUser(role)` → saves to localStorage
- `logout()` → clears localStorage, redirects to login

---

## 5. File Structure

```
src/
├── app/
│   ├── App.tsx                    # Root — renders RouterProvider
│   ├── routes.tsx                 # All route definitions
│   ├── lib/
│   │   ├── auth.ts                # Auth helpers + types
│   │   ├── scoring.ts             # Scoring constants + range calculator
│   │   └── mockApi.ts             # All mock data + fake fetch function
│   └── components/
│       ├── RootLayout.tsx         # App shell: sidebar, nav, top bar
│       ├── CreatorSidePanel.tsx   # Slide-in panel: profile/score/negotiate tabs
│       ├── EmptyState.tsx         # Reusable empty state component
│       ├── Toast.tsx              # Toast notification (auto-dismiss)
│       ├── figma/
│       │   └── ImageWithFallback.tsx  # Img wrapper with fallback
│       ├── modals/
│       │   ├── DisconnectSheetModal.tsx   # Confirm sheet disconnect
│       │   └── PushToClientModal.tsx      # Push creators to client review
│       └── screens/
│           ├── Login.tsx           # Role selector + password auth
│           ├── SheetConnector.tsx  # Google Sheet URL connect screen
│           ├── Dashboard.tsx       # Campaign health overview
│           ├── Brief.tsx           # Campaign brief (Ops: edit, Lead: read)
│           ├── Import.tsx          # CSV/Sheet import (Ops only)
│           ├── Creators.tsx        # Pipeline screen (Ops only)
│           ├── CreatorsOrdered.tsx # Activations screen (Ops only)
│           ├── Approvals.tsx       # Lead approval queue (Lead only)
│           ├── Orders.tsx          # Orders + payments (Lead primary)
│           ├── Negotiate.tsx       # Offer negotiation (unused in routing)
│           ├── Qualify.tsx         # Creator qualification (unused in routing)
│           ├── Pipeline.tsx        # Pipeline alt view (unused in routing)
│           └── PendingApproval.tsx # Pending approval alt (unused in routing)
└── styles/
    ├── theme.css        # CSS custom properties — all design tokens
    ├── fonts.css        # Google Font imports
    ├── index.css        # Global base styles
    ├── globals.css      # Additional globals
    └── tailwind.css     # Tailwind entry
```

---

## 6. Routing

**File:** `src/app/routes.tsx`

| Path | Component | Who sees it |
|---|---|---|
| `/login` | `Login` | Public |
| `/connect` | `SheetConnector` | Authenticated users without a sheet |
| `/` | `Dashboard` (in RootLayout) | Both roles |
| `/brief` | `Brief` | Both (Ops: editable, Lead: read-only) |
| `/import` | `Import` | Ops only |
| `/creators` | `Creators` (Pipeline) | Ops only |
| `/creators-ordered` | `CreatorsOrdered` (Activations) | Ops only |
| `/approvals` | `Approvals` | Lead only |
| `/orders` | `Orders` | Both (Lead primary) |

**Unused routes** (components exist but not registered): `/negotiate`, `/qualify`, `/pipeline`, `/pending-approval`

Navigation enforcement is by sidebar visibility only — no route-level guards. A Lead who manually navigates to `/import` will land on the Import screen (no hard redirect block beyond sidebar hiding).

---

## 7. Data Models

### User
```typescript
type UserRole = "ops" | "lead";
interface User {
  role: UserRole;
  name: string;
}
```

### Campaign Brief
```typescript
interface BriefData {
  campaignName: string;
  clientName: string;
  msaBudget: number;
  platform: string;            // "Instagram" | "TikTok" | etc.
  contentFormat: string;       // "Reel 30-60s" | etc.
  postingStartDate: string;
  postingEndDate: string;
  hook: string;
  cta: string;
  complianceNotes: string;
  financialTriggerType: string;
  financialTriggerDate: string;
}
```

### Creator (Pipeline)
Creators in the pipeline (`Creators.tsx`) use ad-hoc object shapes from mockApi. Key fields:
- `id`, `name`, `handle`, `followers`, `platform`
- `status`: `"New bid" | "Negotiating" | "Final bid set" | "Silent 48h+" | "Scoring" | "Counter sent"`
- `ask`, `offer`, `finalBid`
- `productionTier` (1–5), `contentMatch` (1–5), `audienceFit` (1–5)
- `nicheTags` (string[]), `riskFlag`, `notes`

### Approval Creator
```typescript
interface Creator {
  id: number;
  name: string;
  handle: string;
  size: string;                  // follower count display
  tierNum: number;               // production tier 1–5
  finalPrice: number;
  marketRateHigh: number;
  contentMatchNum: number;
  audienceFitNum: number;
  whyXWRecommends: string;
  briefFitExplanation: string;
  audienceFitExplanation: string;
  opsNotes: string;
  opsName?: string;
  contentQuality?: string;
  briefAlignment?: string;
  audienceOverlap?: string;
}

interface ApprovedCreator extends Creator {
  approvedDate: string;
  clientStatus: "Pending view" | "Viewed" | "Waitlisted" | "Ordered" | "Passed";
}

interface PassedBackCreator extends Creator {
  passBackReason: string;
  passBackDate: string;
}
```

### Order
```typescript
interface Order {
  creator: string;
  price: string;
  paymentStatus: "Unpaid" | "Invoiced" | "Paid" | "Overdue";
  creatorPaid: "Yes" | "No" | "Overdue";
  invoiceDue: string;
  scriptStatus: string;
  contentStatus: string;
  creatorNotified: boolean;
  dueDate: string;
  pipeline?: PaymentPipeline;
}

interface PaymentPipeline {
  invoice: { complete: boolean; date?: string };
  funded: { complete: boolean; date?: string };
  scriptApproved: { complete: boolean; date?: string };
  contentApproved: { complete: boolean; date?: string };
  timer: { complete: boolean; daysRemaining?: number; startDate?: string };
  paid: { complete: boolean; date?: string };
}
```

### Activation (Creators Ordered)
```typescript
interface Activation {
  id: number;
  name: string;
  handle: string;
  followers: string;
  finalBid: number;
  confirmedDate: string;
  pipeline: ActivationPipeline;
  notes: string;
}

interface ActivationPipeline {
  notified: { complete: boolean; date?: string };
  scriptReceived: { complete: boolean; date?: string; link?: string };
  clientReviewingScript: { complete: boolean; date?: string };
  contentReceived: { complete: boolean; date?: string; link?: string };
  clientReviewingContent: { complete: boolean; date?: string };
  clientApproved: { complete: boolean; date?: string };
  posted: { complete: boolean; date?: string };
}
```

### Client Selection (Orders screen)
```typescript
interface ClientSelection {
  creator: string;
  level: number;
  finalBid: number;
  sentDate: string;
  clientStatus: "Pending view" | "Viewed" | "Waitlisted" | "Ordered" | "Passed";
  lastStatusChange?: string;
}
```

---

## 8. Scoring System

**File:** `src/app/lib/scoring.ts`

Creators are scored on three dimensions, each 1–5:

| Dimension | Label (score 1) | Label (score 5) |
|---|---|---|
| Production Tier | Raw · Shaky cam | Studio · Top performer |
| Content Match | Off entirely | Perfect |
| Audience Fit | Wrong demographic | Ideal |

**Recommended Range Calculator** (`calculateRecommendedRange(ask)`):
Produces a low/high bid range as a % of creator's ask, tiered by ask amount:

| Ask Amount | Range % |
|---|---|
| ≤ $500 | 60–80% |
| $501–$800 | 50–60% |
| $801–$1,500 | 40–55% |
| $1,501–$3,000 | 35–50% |
| $3,001–$5,000 | 30–45% |
| $5,001–$7,000 | 28–40% |
| > $7,000 | 25–40% |

Results rounded to nearest $50.

**Auto-detected Risk Flags** (in `Creators.tsx`):
- `Silent 48h+` — creator hasn't responded in 48 hours
- `Overpriced` — ask significantly above market rate
- `Unproven` — no prior brand deals detected

Flags can be individually dismissed per session.

---

## 9. Screen-by-Screen Reference

### Login (`/login`)
- Role toggle: Ops / Lead
- Password input with error state
- Hardcoded: `ops123`, `lead123`
- On success: stores role in localStorage → redirects to `/connect` or `/`

### Sheet Connector (`/connect`)
- Accepts Google Sheet URL
- Extracts sheet ID via regex
- Stores in localStorage as `xw_sheet_id`
- Disconnect modal with confirmation

### Dashboard (`/`)
- Ops view: pipeline health metrics (creators by stage, budget committed vs. MSA, days to close)
- Lead view: campaign realization view (approvals pending, client selections, spend)
- Loads from `Campaign_Brief` + `Supply_Pipeline` mock tabs
- Shows countdown timer to posting start date

### Brief (`/brief`)
- **Ops:** Fully editable form. Fields: campaign name, client, budget, platform, content format, dates, hook, CTA, compliance notes, financial trigger. Import from Google Doc URL (simulated). Save to sheet (simulated).
- **Lead:** Read-only view of same data. Clean card layout.

### Import (`/import`) — Ops only
- CSV file upload with progress simulation
- Sheet import from `Latest_Export` tab
- Shows import result: new creators added, duplicates skipped, in-negotiation creators flagged
- Recent import history list

### Pipeline (`/creators`) — Ops only
Previously named "Creators." The main Ops workspace.

**Filters:** All · New Bids · Negotiating · Final Bids · Scoring

**Per-creator actions by status:**
| Status | Primary Action |
|---|---|
| New bid / Counter sent | Open scoring panel |
| Negotiating | Log counter |
| Final bid set | Push to approval |
| Silent 48h+ | Flag / follow up |
| Scoring | Complete score |

**Side panel (CreatorSidePanel):** Three tabs:
1. **Profile** — follower count, platform, niche tags, notes
2. **Score** — production tier, content match, audience fit sliders; auto-calculated rec range
3. **Negotiate** — counter offer entry, status, final bid lock

**Scoring panel** (inline, full-width): Replaces side panel with dedicated scoring form. Fields: production tier (1–5), content match (1–5), audience fit (1–5), niche tags, format fit, past brand deal, estimated views, rec range (auto-filled), risk flag, notes.

**Multi-select:** Checkbox column for batch actions (batch push, batch pass).

**Sort order:** Silent 48h+ → Final bid set → Scoring → Negotiating → New bid

### Activations (`/creators-ordered`) — Ops only
Previously named "Creators Ordered." Tracks post-approval, post-order creator delivery.

**Activation pipeline (7 steps):**
1. Notified
2. Script Received (+ link)
3. Client Reviewing Script
4. Content Received (+ link)
5. Client Reviewing Content
6. Client Approved
7. Posted

Each step is advanced via a primary action button. Steps 2 and 4 accept a link. Expandable rows show full pipeline timeline with dates.

### Approvals (`/approvals`) — Lead only
**Three sections:**
1. **Pending Approval** — creators submitted by Ops for Lead review
2. **Sent to Client** — approved creators with client engagement status
3. **Passed Back** — creators rejected by Lead with reason

**Per-creator actions:**
- Expand row for full scoring breakdown (tier, content match, audience fit, explanations, Ops notes)
- **Approve** — moves to "Sent to Client" section, triggers `PushToClientModal`
- **Pass Back** — popover with reason selection (Overpriced, Not brand-safe, Audience mismatch, Content quality, Other)

**Approve All** button for batch approval.

**Badge:** Approvals pending count shown in sidebar badge, persisted in localStorage.

### Orders (`/orders`) — Lead primary, Ops can view
Three tabs:

**Tab 1: Client Selections**
Table of all creators sent to client with status column:
`Pending view → Viewed → Waitlisted → Ordered → Passed`

**Tab 2: Payments**
Tracks two payment flows per order:
- **Client → XW:** Invoice sent → Funded
- **XW → Creator:** Script approved → Content approved → Timer (payment window) → Creator paid

Expandable rows show payment pipeline with step-by-step advancement.

**Tab 3: Creator Bench**
Searchable/filterable list of all creators considered for the campaign with niche tags and final campaign status.

---

## 10. Shared Components

### RootLayout
App shell. Contains:
- Left sidebar with role-specific navigation links
- Approvals badge (count from localStorage)
- Sheet connection status chip
- Disconnect sheet button → `DisconnectSheetModal`
- Switch role button → logs out, returns to login
- Mobile: collapsible sidebar with backdrop overlay

### CreatorSidePanel
Slide-in right panel used in Pipeline screen. Three tabs: Profile, Score, Negotiate. Controlled from parent via props. Score tab mirrors scoring.ts labels.

### EmptyState
Reusable zero-data state component. Accepts `icon`, `title`, `description`, optional `action` button.

### Toast
Manual toast component (not Sonner). Renders a timed notification. Auto-dismisses after configurable duration (default 3000ms). Positioned fixed bottom-right.

### DisconnectSheetModal
Confirmation dialog before disconnecting Google Sheet. Warns that all data will need to be re-imported.

### PushToClientModal
Shows after Lead approves a creator. Confirms the push action and displays creator summary.

### ImageWithFallback
Wrapper around `<img>` that renders a placeholder on image load error. Used for creator avatars and any dynamic image content.

---

## 11. Mock API & Data

**File:** `src/app/lib/mockApi.ts`

Single function `fetchSheetData(sheetId, tab)` that returns mock data regardless of `sheetId`. Simulates network delay (~800ms). Tab names match expected Google Sheet tab names:

| Tab Name | Data |
|---|---|
| `Campaign_Brief` | Single campaign record |
| `Supply_Pipeline` | 6 creators at various pipeline stages |
| `Net_New_Offers` | 4 creators with ask/offer amounts |
| `Score_Creators` | 4 creators with scoring data |
| `Campaign_Orders` | 5 creators with payment/content status |

**Current campaign mock data:**
- Campaign: "Xrossworld Summer 2024"
- Client: "StyleBrand Co"
- Budget: $125,000
- Platform: Instagram (Reel 30–60s)
- Posting: Aug 15–Sep 15, 2024

Additional mock data is **hardcoded directly in screen components** (not in mockApi.ts):
- `Approvals.tsx` — 2 pending creators, mock approved/passed-back lists
- `Orders.tsx` — client selections, bench creators, payment pipelines
- `CreatorsOrdered.tsx` — 3 activations with partial pipeline completion
- `Creators.tsx` — 7 pipeline creators with statuses and scoring data
- `Import.tsx` — 3 recent import history records

---

## 12. State Management

No global state library. All state is local to components via `useState`. Cross-component persistence uses `localStorage`.

### localStorage keys
| Key | Type | Set by | Read by |
|---|---|---|---|
| `xw_user_role` | `"ops" \| "lead"` | Login | RootLayout, all screens |
| `xw_sheet_id` | `string` | SheetConnector | mockApi, all screens |
| `xw_approvals_badge` | `number` | Approvals | RootLayout (badge count) |
| `xw_passed_back` | `JSON string` | Approvals | Creators (pass-back awareness) |

### Key state per screen

**RootLayout:** `sidebarOpen`, `hasSheet`, `disconnectModalOpen`, `approvalsBadgeCount`

**Dashboard:** `loading`, `error`, `data`

**Brief:** `loading`, `saving`, `importing`, `brief`, `docUrl`, `showOverwriteModal`

**Pipeline (Creators):** `loading`, `searchQuery`, `activeFilter`, `selectedIds`, `selectedCreator`, `scoringPanelOpen`, `scoringCreator`, `scoringData`, `passedBackCreators`, `urgencyBannerDismissed`, `expandedCreatorId`

**Approvals:** `visibleCreators`, `approvedCreators`, `passedBackCreators`, `expandedRowId`, `passBackPopoverId`, `passBackReason`, `passBackError`, `toastMessage`

**Orders:** `orders`, `loading`, `error`, `expandedRowIdx`, `activeTab`, `benchSearchQuery`, `benchFilter`

**Activations (CreatorsOrdered):** `activations`, `expandedId`

---

## 13. User Flows

### Ops workflow (day-to-day)
1. **Connect** — paste Google Sheet URL on `/connect`
2. **Brief** — review or fill in campaign brief on `/brief`
3. **Import** — upload CSV or pull from sheet on `/import`; creators enter pipeline
4. **Pipeline** — work through creators on `/creators`:
   - Score creators (production tier, content match, audience fit)
   - Set negotiation rec ranges
   - Log counter offers, advance negotiation
   - Set final bid
   - Push to Lead approval
5. **Activations** — once Lead approves and client orders, track delivery on `/creators-ordered`:
   - Mark creator notified
   - Log script receipt + link
   - Advance through client review → content → post

### Lead workflow (day-to-day)
1. **Approvals** — review Ops-submitted creators on `/approvals`:
   - Read scoring breakdown, XW recommendation, pricing vs. market
   - Approve (moves to client deck) or Pass Back with reason
2. **Orders** — manage post-approval on `/orders`:
   - Monitor client engagement status (viewed, ordered, passed)
   - Track payment pipeline (invoice → fund → creator pay)
   - Browse bench creators
3. **Brief** — read-only reference on `/brief`

### Cross-role handoff points
- Ops scores + sets final bid → pushes to Lead approval queue
- Lead approves → creator appears in client selection view (Orders)
- Lead passes back → creator re-appears in Ops pipeline with reason
- Client orders creator → Ops tracks activation delivery
- Payment milestones advanced by Lead (invoice) and Ops (script/content approval)

---

## 14. What's Built and Working

| Feature | Status |
|---|---|
| Role-based login (ops/lead) | ✅ Working |
| Role-based navigation | ✅ Working |
| Google Sheet connection screen | ✅ Working (UI only, no live API) |
| Dashboard (both role views) | ✅ Working (mock data) |
| Campaign Brief (edit + read-only) | ✅ Working (mock data, save simulated) |
| Import screen (CSV + sheet) | ✅ Working (simulated, Ops only) |
| Pipeline screen with scoring | ✅ Working (mock data) |
| Creator scoring panel | ✅ Working |
| Negotiation tracking | ✅ Working (inline edit) |
| Auto-detected risk flags | ✅ Working |
| Push to approval flow | ✅ Working (UI) |
| Approvals screen (Lead) | ✅ Working (mock data) |
| Pass-back flow with reasons | ✅ Working |
| Approve / Approve All | ✅ Working |
| Approvals badge count | ✅ Working (localStorage) |
| Push to client modal | ✅ Working (UI) |
| Client status tracking (Orders) | ✅ Working (mock data) |
| Payment pipeline (Orders) | ✅ Working (step advancement) |
| Creator bench tab (Orders) | ✅ Working |
| Activations pipeline (7 steps) | ✅ Working (step advancement) |
| Disconnect sheet modal | ✅ Working |
| Mobile-responsive sidebar | ✅ Working |
| Toast notifications | ✅ Working |

---

## 15. What's NOT Built / Known Gaps

| Gap | Notes |
|---|---|
| **Live Google Sheets API** | All data is mocked. Real integration requires Google OAuth + Sheets API v4. `fetchSheetData()` in mockApi.ts needs to be replaced. |
| **Real authentication** | Passwords are hardcoded. Needs Firebase Auth, Supabase, or similar. |
| **Data persistence** | No writes go anywhere. Save/sync actions are simulated with `setTimeout`. |
| **Route guards** | No hard redirect if Lead navigates to `/import` manually. Enforcement is sidebar-visibility only. |
| **Creator data model consolidation** | Creator shape is defined differently in each screen (Creators.tsx, Approvals.tsx, Orders.tsx). Needs a shared type. |
| **Negotiate screen** | `Negotiate.tsx` exists but is not in the active routes. |
| **Qualify, Pipeline, PendingApproval screens** | All exist as components but are not registered in routes. Status unclear — may be legacy. |
| **Brief → Import data flow** | Import results don't feed back into the pipeline in a persistent way; each screen has its own mock. |
| **Pass-back → Pipeline loop** | Passed-back creators appear in localStorage but the Pipeline screen doesn't read this to highlight or filter them. |
| **Push to client** | `PushToClientModal` fires but doesn't move creator data into Orders screen. |
| **Multi-campaign support** | All screens assume a single active campaign. No campaign switcher or campaign list. |
| **Offline / error recovery** | No retry logic beyond a reload. Error states exist but are minimal. |
| **Audit log / history** | No action history. Who approved what and when is not tracked persistently. |
| **Notifications / alerts** | No email or Slack integration for cross-role handoffs. |
| **Export to PDF/CSV** | Orders screen has an export button but it's a stub. |
| **Real image assets** | Creator avatars are initials/placeholder. No real photo pipeline. |
| **Test coverage** | No unit or integration tests exist. |

---

## 16. Onboarding Checklist for New Developer

1. **Run locally:**
   - `pnpm install`
   - Dev server is already configured for Vite — `pnpm dev`
   - Login with `ops` / `ops123` or `lead` / `lead123`
   - Paste any URL into the sheet connector (it accepts anything)

2. **Understand the mock data boundary:**
   - Everything you see is in `src/app/lib/mockApi.ts` or hardcoded in individual screen components
   - "Save" and "Sync" buttons fake a delay and show success — nothing actually writes anywhere

3. **Key files to read first:**
   - `src/app/routes.tsx` — routing map
   - `src/app/lib/auth.ts` — auth model
   - `src/app/lib/mockApi.ts` — all mock data
   - `src/app/lib/scoring.ts` — scoring constants
   - `src/app/components/RootLayout.tsx` — shell + nav logic
   - `src/styles/theme.css` — all design tokens

4. **To add a new screen:**
   - Create `src/app/components/screens/MyScreen.tsx`
   - Add route in `routes.tsx`
   - Add nav item in `RootLayout.tsx` under the appropriate role block

5. **To replace mock data with live Sheets:**
   - Replace `fetchSheetData()` in `mockApi.ts` with real Google Sheets API calls
   - Requires: Google OAuth flow, service account or user token, Sheets API v4 enabled
   - Tab names in the mock map 1:1 to sheet tab names — preserve those names in the real sheet

6. **Design system:**
   - shadcn/ui components are pre-installed under `src/components/ui/`
   - All Tailwind tokens come from `theme.css` — don't add raw hex colors inline
   - Use `text-primary`, `bg-primary`, `border-border`, etc. for consistency
