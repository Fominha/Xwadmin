# XW Admin — Complete Build Synopsis v2
**Version:** Alpha (internal use)
**Last updated:** 2026-06-08
**Audience:** New or returning developers who need a full working picture of the codebase

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [File Structure](#3-file-structure)
4. [Design Tokens & Theme](#4-design-tokens--theme)
5. [Authentication](#5-authentication)
6. [Routing — Active vs Inactive](#6-routing--active-vs-inactive)
7. [Navigation & RootLayout](#7-navigation--rootlayout)
8. [Screens — Complete Reference](#8-screens--complete-reference)
   - [Login](#login--login)
   - [Sheet Connector](#sheet-connector--connect)
   - [Dashboard](#dashboard-)
   - [Brief](#brief-brief)
   - [Import](#import-import)
   - [Pipeline (Creators)](#pipeline-creators-creators--pipeline)
   - [Activations (Creators Ordered)](#activations-creatorsordered-creators-ordered--activations)
   - [Approvals](#approvals-approvals)
   - [Orders](#orders-orders)
   - [Negotiate (inactive)](#negotiate-negotiate--inactive)
   - [Qualify (inactive)](#qualify-qualify--inactive)
   - [Pipeline alt (inactive)](#pipeline-alt-pipeline--inactive)
   - [Pending Approval (inactive)](#pending-approval-pendingapproval--inactive)
9. [Shared Components](#9-shared-components)
10. [TypeScript Interfaces & Data Models](#10-typescript-interfaces--data-models)
11. [Scoring System](#11-scoring-system)
12. [Mock API & Data Layer](#12-mock-api--data-layer)
13. [State Management](#13-state-management)
14. [What's Connected vs Mock](#14-whats-connected-vs-mock)
15. [Broken, Incomplete & Unconnected Features](#15-broken-incomplete--unconnected-features)
16. [Cross-Role Handoff Points](#16-cross-role-handoff-points)

---

## 1. Project Overview

**XW Admin** is a web-based internal operations tool for Xrossworld, a UGC creator agency. Used by 2–3 internal operators across two roles — **Ops** and **Lead** — to manage creator campaigns from sourcing through client delivery and payment.

The workflow pipeline: **Import → Score → Negotiate → Approve → Activate → Pay**

**Current state:** Alpha. All major screens are built and interactive with mock data. No live backend, no real Google Sheets integration, no real authentication. All data is either hardcoded in components or returned by a fake fetch function in `mockApi.ts`.

---

## 2. Tech Stack

| Layer | Library / Tool | Version |
|---|---|---|
| UI Framework | React | 18.3.1 |
| Language | TypeScript | — |
| Build Tool | Vite | 6.3.5 |
| Routing | React Router | 7.13.0 |
| Styling | Tailwind CSS | 4.1.12 |
| UI Primitives | Radix UI (via shadcn/ui) | Various |
| Icons | Lucide React | — |
| Charts | Recharts | — |
| Animation | Motion (motion/react) | — |
| Toast | Sonner (installed but not used — see §15) | — |
| Package Manager | pnpm | — |
| State | React useState + localStorage | — |
| Backend | None | — |
| Database | None | — |
| Auth | Hardcoded passwords | — |

---

## 3. File Structure

Every file in the project, annotated with purpose:

```
/workspaces/default/code/
├── package.json                         # Dependencies, scripts
├── vite.config.ts                       # Vite build config
├── default_shadcn_theme.css             # Default shadcn theme baseline
├── __figma__entrypoint__.ts             # Auto-generated — do not touch
│
└── src/
    ├── app/
    │   ├── App.tsx                      # Root component — renders RouterProvider only
    │   ├── routes.tsx                   # All route definitions (active + inactive)
    │   │
    │   ├── lib/
    │   │   ├── auth.ts                  # User types, password validation, localStorage session
    │   │   ├── scoring.ts               # Tier/match/fit labels, bid range calculator
    │   │   └── mockApi.ts               # Fake fetchSheetData() + all mock campaign data
    │   │
    │   └── components/
    │       ├── RootLayout.tsx           # App shell: sidebar, nav, top bar, modals
    │       ├── CreatorSidePanel.tsx     # 600px slide-in panel (Profile/Score/Negotiate tabs)
    │       ├── EmptyState.tsx           # Generic zero-state display component
    │       ├── Toast.tsx                # Manual toast (NOT Sonner — custom component)
    │       │
    │       ├── figma/
    │       │   └── ImageWithFallback.tsx    # <img> wrapper with error fallback
    │       │
    │       ├── modals/
    │       │   ├── DisconnectSheetModal.tsx # AlertDialog: confirm sheet disconnect
    │       │   └── PushToClientModal.tsx    # Dialog: confirm push creator to client deck
    │       │
    │       └── screens/
    │           ├── Login.tsx            # Role selector + password form
    │           ├── SheetConnector.tsx   # Google Sheet URL input and connect flow
    │           ├── Dashboard.tsx        # Campaign health overview (Ops + Lead views)
    │           ├── Brief.tsx            # Campaign brief (Ops: edit, Lead: read-only)
    │           ├── Import.tsx           # CSV/Sheet import (Ops only)
    │           ├── Creators.tsx         # Pipeline screen — main Ops workspace
    │           ├── CreatorsOrdered.tsx  # Activations — post-order delivery tracking
    │           ├── Approvals.tsx        # Lead review queue + pass-back flow
    │           ├── Orders.tsx           # Client selections + payments + bench (3 tabs)
    │           │
    │           │   ── INACTIVE (not in routes, likely legacy) ──
    │           ├── Negotiate.tsx        # Offer negotiation table (unused)
    │           ├── Qualify.tsx          # Score entry form (unused)
    │           ├── Pipeline.tsx         # Pipeline table alt view (unused)
    │           └── PendingApproval.tsx  # Send-to-Lead table (unused)
    │
    └── styles/
        ├── theme.css                    # All CSS custom properties (colors, radius, etc.)
        ├── fonts.css                    # Google Font imports (top of file only)
        ├── index.css                    # Global base styles
        ├── globals.css                  # Additional global overrides
        └── tailwind.css                 # Tailwind entry point
```

---

## 4. Design Tokens & Theme

**File:** `src/styles/theme.css`

All colors are CSS custom properties. Use tokens in Tailwind classes (`text-primary`, `bg-muted`, etc.) — never raw hex values inline.

| Token | Light Mode Value | Usage |
|---|---|---|
| `--primary` | `#038B97` | Teal — primary buttons, active nav, links, accents |
| `--secondary` | `#E3FF27` | Acid yellow — accent highlights |
| `--background` | `#F4F4F2` | Page background |
| `--foreground` | `#1a1a1a` | Body text |
| `--card` | `#ffffff` | Card surfaces |
| `--border` | `#E0E0DE` | Borders, dividers |
| `--muted` | `#E0E0DE` | Muted backgrounds |
| `--muted-foreground` | `#6b7280` | Secondary/helper text |
| `--destructive` | `#dc2626` | Error states, destructive actions |
| `--chart-1` | `#038B97` | Chart teal |
| `--chart-2` | `#3b82f6` | Chart blue |
| `--chart-3` | `#f59e0b` | Chart amber |
| `--chart-4` | `#10b981` | Chart green |
| `--chart-5` | `#a855f7` | Chart purple |

**Border radius:** `0.5rem`

**Typography defaults (from theme.css):**
- h1: `text-2xl`, medium weight
- h2: `text-xl`, medium weight
- h3: `text-lg`, medium weight
- h4/label/button: `text-base`, medium weight

Dark mode is defined using `oklch` color space but is not user-togglable in the UI.

---

## 5. Authentication

**File:** `src/app/lib/auth.ts`

**How it works:** Passwords are hardcoded strings. There is no server, no JWT, no session token. Role is stored as a plain string in `localStorage`.

| Role | Password | Default name stored |
|---|---|---|
| `ops` | `ops123` | "Ops" |
| `lead` | `lead123` | "Lead" |

**localStorage key:** `xw_user_role` — stores `"ops"` or `"lead"`

**Exported functions:**

| Function | Signature | What it does |
|---|---|---|
| `authenticateUser` | `(role, password) → boolean` | Checks password against hardcoded map |
| `getCurrentUser` | `() → User \| null` | Reads `xw_user_role` from localStorage |
| `setCurrentUser` | `(role) → void` | Writes role to localStorage |
| `logout` | `() → void` | Removes `xw_user_role` from localStorage |

**Auth gate:** `RootLayout.tsx` checks `getCurrentUser()` on every render. Redirects to `/login` if null, redirects to `/connect` if no `xw_sheet_id` in localStorage.

**Security note:** This is demo-only. No real protection exists. Any user who sets `localStorage.setItem("xw_user_role", "lead")` in the browser console has Lead access.

---

## 6. Routing — Active vs Inactive

**File:** `src/app/routes.tsx`

### Active Routes

| Path | Component file | Role access | Notes |
|---|---|---|---|
| `/login` | `screens/Login.tsx` | Public | No auth required |
| `/connect` | `screens/SheetConnector.tsx` | Authenticated | Shown when no sheet connected |
| `/` | `screens/Dashboard.tsx` | Both | Nested in RootLayout |
| `/brief` | `screens/Brief.tsx` | Both | Ops: edit, Lead: read-only |
| `/import` | `screens/Import.tsx` | Ops only | Redirects Lead to `/` |
| `/creators` | `screens/Creators.tsx` | Ops only | Listed as "Pipeline" in nav |
| `/creators-ordered` | `screens/CreatorsOrdered.tsx` | Ops only | Listed as "Activations" in nav |
| `/approvals` | `screens/Approvals.tsx` | Lead only | Hidden from Ops nav |
| `/orders` | `screens/Orders.tsx` | Both | Lead primary, Ops can view |

### Inactive Routes (components exist, not registered)

| Intended path | Component file | Status |
|---|---|---|
| `/negotiate` | `screens/Negotiate.tsx` | Built, not routed — likely superseded by Creators.tsx |
| `/qualify` | `screens/Qualify.tsx` | Built, not routed — likely superseded by Creators.tsx scoring panel |
| `/pipeline` | `screens/Pipeline.tsx` | Built, not routed — alternate pipeline view, possibly legacy |
| `/pending-approval` | `screens/PendingApproval.tsx` | Built, not routed — superseded by Approvals.tsx |

**Route guards:** None. Access control is enforced only by sidebar visibility. A Lead who manually types `/import` in the URL will reach the Import screen — the component does redirect Leads to `/`, but this is a component-level check, not a router-level guard.

---

## 7. Navigation & RootLayout

**File:** `src/app/components/RootLayout.tsx`

App shell that wraps all authenticated screens. Contains the sidebar, top bar, sheet status, and disconnect modal.

### State

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `sidebarOpen` | `boolean` | `true` on ≥1024px, `false` on mobile | Mobile sidebar toggle |
| `hasSheet` | `boolean` | From localStorage | Shows/hides sheet status chip |
| `disconnectModalOpen` | `boolean` | `false` | Controls DisconnectSheetModal visibility |
| `user` | `User \| null` | From `getCurrentUser()` | Drives role-based nav |
| `approvalsBadgeCount` | `number` | `2` | Approvals nav badge; syncs via `storage` event listener |

### Sidebar — Ops Navigation

| Label | Icon | Route | Badge |
|---|---|---|---|
| Dashboard | Home | `/` | None |
| Brief | FileText | `/brief` | None |
| Import | Upload | `/import` | None |
| Pipeline | Users | `/creators` | None |
| Activations | ShoppingCart | `/creators-ordered` | None |

### Sidebar — Lead Navigation

| Label | Icon | Route | Badge |
|---|---|---|---|
| Dashboard | Home | `/` | None |
| Approvals | CheckCircle | `/approvals` | `approvalsBadgeCount` (teal) |
| Orders | ShoppingCart | `/orders` | `15` (hardcoded — not dynamic) |
| Brief | FileText | `/brief` | None |

### Sidebar — Bottom Controls

| Element | Action |
|---|---|
| Sheet connection chip | Shows sheet connected status with green dot |
| "Disconnect" button | Opens `DisconnectSheetModal` |
| "Switch role" button | Calls `logout()`, navigates to `/login` |
| User badge | Displays current role name |

### Top Bar

- Campaign name (read from mock data — static "Xrossworld Summer 2024")
- Connected sheet indicator
- Responsive: sidebar collapses to overlay on mobile with backdrop click-to-close

### Behaviors

- `handleDisconnect()`: Removes `xw_sheet_id` from localStorage, navigates to `/connect`
- `handleSwitchRole()`: Calls `logout()`, navigates to `/login`
- `approvalsBadgeCount` updates via `window.addEventListener("storage", ...)` — this is how Approvals.tsx pushes badge updates to the sidebar without shared state

---

## 8. Screens — Complete Reference

---

### Login — `/login`

**File:** `src/app/components/screens/Login.tsx`

**Purpose:** Role selection and password entry. First screen a new session sees.

#### State

| Variable | Type | Default |
|---|---|---|
| `selectedRole` | `"ops" \| "lead"` | `"ops"` |
| `password` | `string` | `""` |
| `error` | `string` | `""` |

#### Interactive Elements

| Element | Type | Action |
|---|---|---|
| "Ops" card | Button | Sets `selectedRole = "ops"`, highlights card |
| "Lead" card | Button | Sets `selectedRole = "lead"`, highlights card |
| Password input | `<input type="password">` | Updates `password` state; Enter key triggers login |
| "Sign in" button | Button (teal) | Calls `authenticateUser(selectedRole, password)`. On success: calls `setCurrentUser(role)`, navigates to `/connect` or `/` depending on sheet presence. On fail: sets error message. |

#### Error Messages

- "Password required" — shown if password is empty
- "Invalid password" — shown if password doesn't match

#### Demo credentials hint

- Static text: "For demo: ops123 or lead123"

---

### Sheet Connector — `/connect`

**File:** `src/app/components/screens/SheetConnector.tsx`

**Purpose:** One-time sheet connection screen. Shown after login if `xw_sheet_id` is not in localStorage.

#### State

| Variable | Type | Default |
|---|---|---|
| `sheetUrl` | `string` | `""` |
| `connected` | `boolean` | `false` |
| `sheetName` | `string` | `""` |
| `disconnectModalOpen` | `boolean` | `false` |

#### Interactive Elements

| Element | Type | Action |
|---|---|---|
| Sheet URL input | `<input>` | Updates `sheetUrl` state |
| "Connect sheet" button | Button (teal) | Extracts sheet ID from URL using regex `/\/d\/([a-zA-Z0-9-_]+)/`, saves to `localStorage["xw_sheet_id"]`, sets `sheetName = "Campaign Q2 2026"` (hardcoded), sets `connected = true`, then navigates to `/` after 1000ms |
| "Disconnect" button | Button (destructive) | Opens `DisconnectSheetModal` |

#### Behaviors

- Sheet name shown after connection is hardcoded: `"Campaign Q2 2026"` — not read from actual sheet
- Any URL containing `/d/ANYTHING/` will succeed — no validation beyond regex match

---

### Dashboard — `/`

**File:** `src/app/components/screens/Dashboard.tsx`

**Purpose:** Campaign health overview. Renders different content based on user role.

#### State

| Variable | Type | Default |
|---|---|---|
| `loading` | `boolean` | `true` |
| `error` | `string \| null` | `null` |
| `data` | `DashboardData \| null` | `null` |

#### Data Load

Calls `fetchSheetData(sheetId, "Campaign_Brief")` and `fetchSheetData(sheetId, "Supply_Pipeline")` in parallel on mount. Computes `committed` as the sum of all `finalBid` values from Supply_Pipeline.

---

#### OPS DASHBOARD

**Sticky header bar:** Campaign name, posting date range, days until supply chain closes (color-coded: red if <7, amber if <14, green otherwise).

**Section 1 — "Needs your attention" (3 cards):**

| Card | Content | Button | Button action |
|---|---|---|---|
| Act now (red border) | "New bids, counters waiting, creators silent 48+ hours" — count: 12 | "Review" | Navigates to `/creators?filter=urgent` |
| Waiting on creator (amber border) | "Counter sent, awaiting response" — count: 8 | None | — |
| Ready for Lead (green border) | "Scored and final bid set" — count: 8 | "View" | Navigates to `/pending-approval` (inactive route — will 404) |

> **Bug:** "View" button navigates to `/pending-approval` which is not a registered route.

**Section 2 — "Supply overview" (5 stat cards):**
All values are hardcoded mock numbers:
- Total in pool: 156
- New this week: 23
- Scored: 89
- Matched to brief: 47
- Activated: 34

**Section 3 — "Pipeline health" (4 progress bars):**
All values hardcoded. Target = 80.

| Metric | Current | Status label |
|---|---|---|
| Bids received | 47 | On track |
| Being scored | 12 | Behind |
| In negotiation | 18 | At risk |
| Final bid set | 8 | Behind |

---

#### LEAD DASHBOARD

**Campaign realization box (budget breakdown):**

| Segment | Value | Color |
|---|---|---|
| Realized | $1,350 | Teal progress bar |
| In play | $2,860 | Blue progress bar |
| At risk | $2,100 | Red |
| Remaining | Calculated | Gray |

All values are hardcoded.

**"Action required" section (4 priority items, in order):**

| Item | Count | Link text | Link action |
|---|---|---|---|
| Overdue payments | 3 | "View overdue →" | No action (plain text link, no onClick) |
| Supply window closing | 7d | "View pipeline →" | No action |
| Creators pending approval | 8 | "Review approvals →" | No action |
| Waitlisted by client | 4 | "Follow up with client →" | No action |

> **Bug:** All four "action required" links render as styled text but have no `onClick` or `href` — they are non-functional.

---

### Brief — `/brief`

**File:** `src/app/components/screens/Brief.tsx`

**Purpose:** Campaign brief entry and display. Ops can edit; Lead sees read-only.

#### State

| Variable | Type | Default |
|---|---|---|
| `loading` | `boolean` | `true` |
| `saving` | `boolean` | `false` |
| `importing` | `boolean` | `false` |
| `docUrl` | `string` | `""` |
| `showOverwriteModal` | `boolean` | `false` |
| `brief` | `BriefData` | Loaded from mock |

#### OPS BRIEF — Interactive Elements

**Import from Doc:**

| Element | Type | Action |
|---|---|---|
| Google Doc URL input | `<input>` | Updates `docUrl` |
| "Import brief" button | Button (teal, disabled if no URL) | If `brief` has existing data, opens overwrite modal. Otherwise calls `executeImport()`. |
| Overwrite modal "Overwrite" | Button (destructive) | Calls `executeImport()`, closes modal |
| Overwrite modal "Cancel" | Button (outline) | Closes modal |

`executeImport()`: Sets `importing = true`, waits 1500ms, fills `brief` with hardcoded demo values (the same data from mockApi), sets `importing = false`.

**Form fields (all call `updateField(key, value)`):**

| Field | Input type | Options |
|---|---|---|
| Campaign Name | Text input | Free text |
| Client Name | Text input | Free text |
| MSA Budget | Number input | Free text, `$` prefix |
| Platform | Select | Instagram, TikTok, YouTube, Multi-platform |
| Content Format | Text input | Free text |
| Posting Start Date | Date input | — |
| Posting End Date | Date input | — |
| Financial Trigger Type | Select | MSA Signed, CC Charged, Wire Received |
| Financial Trigger Date | Date input | — |
| Hook | Textarea (3 rows) | Free text |
| CTA | Text input | Free text |
| Compliance Notes | Textarea (3 rows) | Free text |

**Alerts:**
- Amber alert shows if `financialTriggerDate` is empty: "Financial trigger date not set — the supply chain close date can't be calculated."
- Countdown badge shows days until supply closes (calculated from `postingStartDate`)

**Save button:** "Save brief →" (disabled while `saving`). Calls `handleSave()`: sets `saving = true`, waits 1200ms (fake delay), sets `saving = false`. **Nothing is written anywhere.**

Footer note: "Saved locally for now — sheet sync coming soon."

#### LEAD BRIEF — Read-Only View

Same data displayed in a 3-column card layout (label | value spanning 2 cols). No inputs. Footer: "Brief is managed in Ops view."

---

### Import — `/import`

**File:** `src/app/components/screens/Import.tsx`

**Purpose:** Bring new creators into the pipeline. Ops only — Lead is redirected to `/` on mount.

#### State

| Variable | Type | Default |
|---|---|---|
| `uploading` | `boolean` | `false` |
| `uploadProgress` | `number` | `0` |
| `importResult` | `ImportResult \| null` | `null` |
| `importing` | `boolean` | `false` |

#### Interactive Elements

**Card 1 — Upload CSV:**

| Element | Type | Action |
|---|---|---|
| Drag-and-drop zone | `<div>` with `onClick` | Opens file picker |
| Hidden file input | `<input type="file" accept=".csv">` | Triggers `handleFileSelect()` |
| Progress bar | Display only | Shows `uploadProgress` during upload |

`handleFileSelect(e)`: Sets `uploading = true`, `uploadProgress = 0`. Uses `setInterval` (200ms) to increment progress by 10. At 100%: clears interval, sets `uploading = false`, sets `importResult = { newCreators: 14, duplicates: 3, inNegotiation: 2 }` (hardcoded). **No actual file is read.**

**Card 2 — Import from Sheet:**

| Element | Type | Action |
|---|---|---|
| "Import from Latest_Export" button | Button (teal) | Calls `handleSheetImport()` |

`handleSheetImport()`: Sets `importing = true`, waits 1500ms, sets `importResult = { newCreators: 8, duplicates: 1, inNegotiation: 3 }` (hardcoded), sets `importing = false`. **No sheet is read.**

**Import Result Card (appears after either import):**
- "14 new creators added" (teal)
- "3 duplicates skipped" (gray)
- "2 now in negotiation" (teal)

**Recent Imports Table (static, always visible):**

| Batch | Date/Time | Creators added | Duplicates skipped |
|---|---|---|---|
| Batch 10 | Apr 24 2026, 2:14 PM | 14 | 3 |
| Batch 9 | Apr 22 2026, 10:08 AM | 22 | 7 |
| Batch 8 | Apr 19 2026, 3:55 PM | 18 | 4 |

---

### Pipeline (Creators) — `/creators` — `/pipeline`

**File:** `src/app/components/screens/Creators.tsx`

**Purpose:** Main Ops workspace. View and act on every creator in the current campaign's pipeline. Score, negotiate, and push to Lead approval from here.

#### State

| Variable | Type | Default |
|---|---|---|
| `loading` | `boolean` | `true` |
| `searchQuery` | `string` | `""` |
| `activeFilter` | `string` | URL param `filter` or `"All"` |
| `selectedIds` | `number[]` | `[]` |
| `selectedCreator` | `any` | `null` |
| `scoringPanelOpen` | `boolean` | `false` |
| `scoringCreator` | `any` | `null` |
| `scoringData` | `ScoringData object` | See below |
| `passedBackCreators` | `Record<number, string>` | From localStorage `xw_passed_back_creators` |
| `nicheSearchQuery` | `string` | `""` |
| `dismissedAutoFlags` | `string[]` | `[]` |
| `urgencyBannerDismissed` | `boolean` | `false` |
| `expandedCreatorId` | `number \| null` | `null` |

`scoringData` default:
```
{
  contentQuality: "",
  briefAlignment: "",
  audienceOverlap: "",
  nicheTags: [],
  formatFit: "",
  pastBrandDeal: false,
  estimatedViews: "",
  recRangeLow: "",
  recRangeHigh: "",
  riskFlag: "",
  notes: ""
}
```

#### Mock Creators (7 total)

| # | Name | Handle | Followers | Ask | Status |
|---|---|---|---|---|---|
| 1 | Sarah Johnson | @sarahjstyle | 245K | $500 | New bid |
| 2 | Marcus Chen | @marcusfashion | 189K | $420 | Negotiating |
| 3 | Emma Davis | @emmastyle | 312K | $650 | Final bid set |
| 4 | Alex Rivera | @alexstyle | 156K | $380 | Silent 48h+ |
| 5 | Jamie Lee | @jamielee | 203K | $550 | Scoring |
| 6 | Taylor Kim | @taylorkstyle | 178K | $390 | Scoring |
| 7 | Jordan Park | @jordanp | 198K | $410 | Counter sent |

#### Stage Filters (tabs)

`"All"` · `"New bid"` · `"Scoring"` · `"Negotiating"` · `"Final bid set"` · `"Silent 48h+"`

Selecting a filter updates `activeFilter` and changes visible columns.

#### Table Columns (by active filter)

| Filter | Columns shown |
|---|---|
| All | Creator · Their ask · Rec. Range · Status · Last contact · Pipeline dots · Action |
| New bid | Creator · Their ask · Last contact |
| Scoring | Creator · Their ask · Content quality · Brief alignment · Last contact |
| Negotiating | Creator · Their ask · Rec. Range · Last contact |
| Final bid set | Creator · Their ask · Rec. Range · Final bid |
| Silent 48h+ | Creator · Their ask · Last contact · Days silent |

#### Primary Action Button (per creator, status-driven)

| Status | Button label | Button style | onClick action |
|---|---|---|---|
| Silent 48h+ | "Follow up →" | Outline red | `openScoringPanel(creator)` |
| New bid | "Score now →" | Teal solid | `openScoringPanel(creator)` |
| Scoring (incomplete scores) | "Complete scoring →" | Teal solid | `openScoringPanel(creator)` |
| Scoring (scores complete) | "Send counter →" | Teal solid | `openScoringPanel(creator)` |
| Counter sent | "Mark final bid →" | Teal solid | `openScoringPanel(creator)` |
| Negotiating (>2 days silent) | "Follow up →" | Outline red | `openScoringPanel(creator)` |
| Negotiating | "Send counter →" | Teal solid | `openScoringPanel(creator)` |
| Final bid set | "Send to Lead →" | Teal solid | `openScoringPanel(creator)` |

> **Note:** All primary actions open the scoring panel regardless of label. "Send to Lead →", "Mark final bid →", etc. do not perform their labeled action — they all just open the side panel.

#### Scoring Panel (full-width inline panel, replaces table row)

Opens via `openScoringPanel(creator)`. Fields:

| Field | Input type | Values |
|---|---|---|
| Content quality | Select | Raw, Emerging, Practiced, Fluent, Studio |
| Brief alignment | Select | Off-brief, Partially aligned, On-brief, Perfect fit |
| Audience overlap | Select | Weak, Moderate, Strong, Ideal match |
| Niche tags | Searchable buttons | 23 tags: Fashion, Beauty, Skincare, Hair, Lifestyle, Fitness, Wellness, Food, Travel, Tech, Gaming, Parenting, Pet, Home, DIY, Finance, Education, Comedy, Music, Sports, Luxury, Sustainability, Other |
| Format fit | Select | Reel, Static, Story, UGC hybrid |
| Past brand deal? | Toggle buttons | Yes / No |
| Estimated views | Number input | Shows system suggestion |
| Recommended bid range | Two number inputs (Low, High) | Auto-filled by `calculateRecommendedRange(ask)` |
| NEG tier | Read-only display | Calculated from range |
| Risk flag | Select | Includes auto-detected flags |
| Ops notes (visible to Lead) | Textarea | Free text |

**Scoring panel buttons:**

| Button | Action |
|---|---|
| "Save" / "Save & move to negotiation →" | Calls `saveScoringData()` — saves to local state only, no persistence. Label changes if all scores filled. |
| "Cancel" / close icon | Calls `closeScoringPanel()` — clears `scoringPanelOpen`, `scoringCreator`, resets `scoringData` |

#### Urgency Banner

Shows if any creator has `status === "Silent 48h+"` and `urgencyBannerDismissed === false`.

| Element | Action |
|---|---|
| "Silent 48h+" filter link | Sets `activeFilter = "Silent 48h+"` |
| "×" dismiss button | Sets `urgencyBannerDismissed = true` |

#### Row Expansion (chevron click)

Toggles `expandedCreatorId`. Shows:
- Creator handle, follower count
- Scoring badges (Content quality, Brief alignment, Audience overlap) if scored
- Ops notes (if any)
- "Edit scoring →" link — calls `openScoringPanel(creator)`
- "View history →" link — no action wired

#### Multi-Select (checkboxes)

- Per-row checkbox: toggles creator ID in `selectedIds`
- **No batch action buttons are rendered** in this screen. `selectedIds` state exists but is unused in the UI. *(Batch actions are in the inactive `Pipeline.tsx` screen.)*

#### Pass-Back Awareness

On mount, reads `localStorage["xw_passed_back_creators"]` into `passedBackCreators`. Passed-back creators show a yellow "Passed back" badge with reason text below their name. This is the only cross-screen data handoff that works without a shared state layer.

#### Sort Order

`Silent 48h+` → `Final bid set` → `Scoring` → `Negotiating` → `New bid` → everything else

#### Auto-detected Risk Flags

Calculated by `getAutoDetectedFlags(creator)` and shown as dismissible chips above the scoring panel:
- `"Silent 48h+"` — if `creator.daysSilent >= 2`
- `"Overpriced"` — if `creator.theirAsk > creator.recRangeHigh * 1.3` (approximate)
- `"Unproven"` — if `creator.pastBrandDeal === false`

Dismiss via `dismissedAutoFlags` state array.

---

### Activations (CreatorsOrdered) — `/creators-ordered` — `/activations`

**File:** `src/app/components/screens/CreatorsOrdered.tsx`

**Purpose:** Track post-approval, post-order delivery pipeline for each active creator.

#### State

| Variable | Type | Default |
|---|---|---|
| `expandedId` | `number \| null` | `null` |
| `activations` | `Activation[]` | Mock data (3 creators) |

#### Mock Data

| Creator | Followers | Final bid | Status |
|---|---|---|---|
| Marcus Chen | 189K | $420 | Script received, awaiting client review |
| Alex Rivera | 156K | $380 | Awaiting script |
| Emma Davis | 312K | $520 | Fully complete, posted |

#### Summary Stats (4 cards, calculated from activations)

- Pending notification
- Awaiting script
- Awaiting content
- Complete

#### Activation Pipeline (7 steps)

1. Notified
2. Script received *(accepts link)*
3. Client reviewing script *(auto — no action needed)*
4. Content received *(accepts link)*
5. Client reviewing content *(auto — no action needed)*
6. Client approved
7. Posted

#### Primary Action Button (per creator)

`getPrimaryAction(pipeline)` returns the button for the current step:

| Current step | Button label | Action |
|---|---|---|
| Notified (incomplete) | "Log notified →" | `handlePipelineStep(id, "notified")` |
| Script received (incomplete) | "Log script received →" | `handlePipelineStep(id, "scriptReceived")` |
| Content received (incomplete) | "Log content received →" | `handlePipelineStep(id, "contentReceived")` |
| Client approved (incomplete) | "Log client approved →" | `handlePipelineStep(id, "clientApproved")` |
| All complete | "Mark posted →" | `handlePipelineStep(id, "posted")` |
| Posted | "Done" (static text) | — |

`handlePipelineStep(id, step, link?)`: Finds activation by ID, sets `pipeline[step].complete = true` and `pipeline[step].date = today`, optionally sets link. Updates `activations` state.

#### Row Expansion

Toggles `expandedId`. Shows:
- Creator details (handle, followers, confirmed date, final bid)
- Visual pipeline dots (teal = complete, amber = active, gray = locked)
- Relative timestamps for completed steps ("2d ago", etc.)
- Script/Content link inputs with copy-to-clipboard button
- "Save & advance" button for active steps with link input
- Notes textarea (visible to Lead)

---

### Approvals — `/approvals`

**File:** `src/app/components/screens/Approvals.tsx`

**Purpose:** Lead reviews Ops-submitted creators. Approves to client deck or passes back to Ops with reason.

#### State

| Variable | Type | Default |
|---|---|---|
| `expandedRowId` | `number \| null` | `null` |
| `passBackPopoverId` | `number \| null` | `null` |
| `passBackReason` | `string` | `""` |
| `passBackError` | `string` | `""` |
| `toastMessage` | `string` | `""` |
| `visibleCreators` | `Creator[]` | 2 mock creators |
| `levelLegendOpen` | `boolean` | `false` |
| `sentToClientExpanded` | `boolean` | `true` |
| `passedBackExpanded` | `boolean` | `true` |
| `approvedCreators` | `ApprovedCreator[]` | `[]` |
| `passedBackCreators` | `PassedBackCreator[]` | `[]` |

#### Mock Pending Creators

**Creator 1: Sarah Johnson**
- Handle: @sarahjstyle · Size: 245K · Tier: 4 · Final price: $420 · Market rate high: $480
- Content match: 5 ("Perfect") · Audience fit: 4 ("Strong")
- Scored by: Alex Rivera
- Why XW recommends: "Sarah's content quality and audience fit make her a top pick for this campaign"
- Brief fit explanation: "Fashion-lifestyle niche and Reel format match brief exactly"
- Audience fit explanation: "18–34 female audience in US matches campaign target consumer"
- Ops notes: "Strong performer in similar campaigns, reliable delivery timeline"

**Creator 2: Emma Davis**
- Handle: @emmastyle · Size: 312K · Tier: 5 · Final price: $520 · Market rate high: $600
- Content match: 5 ("Perfect") · Audience fit: 5 ("Ideal")
- Scored by: Jordan Lee
- Why XW recommends: "Emma's premium aesthetic is a strong match for this client's brand positioning"
- Brief fit explanation: "Premium aesthetic and storytelling style aligns perfectly with brand voice"
- Audience fit explanation: "Core audience demographic overlap at 92%, highest engagement in target age group"

#### Summary Bar

- Displays total pending value ("Approving all makes $940 available for client selection")
- **"Approve all →" button**: Calls `handleApproveAll()` — moves all `visibleCreators` to `approvedCreators` with `clientStatus: "Pending view"`, clears `visibleCreators`, updates localStorage badge count, shows toast

#### Main Table Columns

| Column | Content | Notes |
|---|---|---|
| Creator name | Full name | — |
| Handle | @handle as link | Opens `https://instagram.com/[handle]` in new tab |
| Level | Tier number + info icon | Info icon opens `levelLegendOpen` popover showing all tier labels |
| Final bid | `$X` | Market reference shown below (`$X vs $X market`) |
| Brief fit | Short label | From `CONTENT_MATCH_SHORT` in scoring.ts |
| Audience fit | Short label | From `AUDIENCE_FIT_SHORT` in scoring.ts |
| GMV impact | `+$X (X% of MSA)` | Calculated as `(finalPrice / msaBudget) * 100` |
| Pass Back | Button (outline) | Opens pass-back popover for this creator |
| Approve | Button (teal) | Calls `handleApprove(creator)` |

#### Per-Creator Actions

**Approve button** — `handleApprove(creator)`:
1. Removes creator from `visibleCreators`
2. Adds to `approvedCreators` with `approvedDate: today`, `clientStatus: "Pending view"`
3. Updates `xw_approvals_count` in localStorage (decrements by 1)
4. Shows toast: "[Name] approved — now visible to client"

> **Gap:** Approving a creator does NOT push them into Orders.tsx. `approvedCreators` lives only in Approvals.tsx local state and is lost on navigation.

**Pass Back button** — `handlePassBackClick(creatorId)`:
- Sets `passBackPopoverId = creatorId`, clears `passBackReason` and `passBackError`

**Pass-Back Popover:**

| Element | Type | Options |
|---|---|---|
| Reason select | `<select>` | Price too high · Not the right fit · Brief misalignment · Try renegotiating · Compliance concern · Other |
| "Cancel" | Button (outline) | Calls `handleCancelPassBack()` — clears popover state |
| "Confirm pass back" | Button (destructive) | Calls `handleConfirmPassBack(creator)` |

`handleConfirmPassBack(creator)`:
1. Validates reason is selected (sets `passBackError` if not)
2. Removes creator from `visibleCreators`
3. Adds to `passedBackCreators` with reason and date
4. Saves to `localStorage["xw_passed_back_creators"]` (JSON)
5. Updates badge count
6. Shows toast: "[Name] passed back to Ops — [reason]"

#### Row Expansion

Clicking a row toggles `expandedRowId`. Shows:
- "Scored by [opsName]"
- Three score badges: content quality · brief alignment · audience overlap
- "Brief fit explained" text
- "Audience fit explained" text
- "Ops notes" (if present, italicized)
- "Why XW recommends" text (lead-facing)

#### Sent to Client Section (collapsible)

Shows only if `approvedCreators.length > 0`. Header chevron toggles `sentToClientExpanded`.

Table columns: Creator · Level · Final bid · Sent date · Client status badge

Client status values and colors:
- "Pending view" — gray
- "Viewed" — blue
- "Waitlisted" — amber
- "Ordered" — teal
- "Passed" — red

#### Passed Back Section (collapsible)

Shows only if `passedBackCreators.length > 0`. Header chevron toggles `passedBackExpanded`.

Table columns: Creator · Level · Final bid · Pass back reason · Date passed back

---

### Orders — `/orders`

**File:** `src/app/components/screens/Orders.tsx`

**Purpose:** Lead-primary screen tracking everything post-approval: what the client has selected, payment pipeline status (both directions), and the full creator bench.

#### State

| Variable | Type | Default |
|---|---|---|
| `loading` | `boolean` | `true` |
| `error` | `boolean` | `false` |
| `orders` | `Order[]` | Loaded from mock |
| `expandedRowIdx` | `number \| null` | `null` |
| `activeTab` | `string` | `"client-selections"` |
| `benchSearchQuery` | `string` | `""` |
| `benchFilter` | `string` | `"All"` |

#### Tab Navigation

Three tabs: **Client Selections** · **Payments** · **Creator Bench**

---

#### TAB 1 — CLIENT SELECTIONS

**Summary row (5 stat chips):**
- Pending review: N
- Viewed: N
- Waitlisted: N
- Ordered: N
- Passed: N

All counts are calculated from `clientSelections` mock array.

**"Client last active" indicator:** Shows relative time (hardcoded "2 hours ago").

**Sync button:** "Sync" (outline) — calls `handleSync()`: sets `loading = true` for 1 second, resets. **No actual sync occurs.**

**Table columns:**

| Column | Notes |
|---|---|
| Creator | Name |
| Level | Tier number |
| Final bid | Formatted currency |
| Sent date | Relative time ("X days ago") |
| Client status | Colored badge; shows alert icon + "X days pending" if status is Pending view or Viewed and >2 days |
| Follow up | "Follow up →" button appears only for Waitlisted creators (no action wired) |

**Mock client selections (6 creators):**

| Creator | Level | Final bid | Client status |
|---|---|---|---|
| Sarah Johnson | 4 | $420 | Ordered |
| Emma Davis | 5 | $520 | Viewed |
| Marcus Chen | 3 | $350 | Pending view |
| Jamie Lee | 3 | $380 | Waitlisted |
| Taylor Kim | 2 | $290 | Passed |
| Alex Rivera | 4 | $410 | Ordered |

---

#### TAB 2 — PAYMENTS

**Client → XW summary (3 metrics):**
- Invoiced: $X (calculated)
- Paid: $X (calculated)
- Overdue: $X (red, calculated)

**XW → Creators summary (5 metrics):**
- Paid: $X
- Awaiting approval: $X
- In timer: $X
- Pending: $X
- Overdue: $X (red)

**Export button:** "Export" (outline) — calls `handleExport()`. **Stub — no file is generated.**

**Table columns (compact pipeline view):**
Creator · Final bid · 6 pipeline step dots (Invoice · Funded · Script approved · Content approved · Timer · Paid)

Pipeline dot states: teal (complete) · amber (active) · gray with lock (future)

**Row Expansion** — toggles `expandedRowIdx`:

Step-by-step breakdown. For each step:
- Dot color (complete/active/locked)
- Step name
- Status badge ("Complete" / "Active" / "Locked")
- **Action button if active:**

| Step | Active button | Action |
|---|---|---|
| Invoice | "Mark invoice sent →" | `handleMarkInvoiceSent(idx)` — sets `paymentStatus = "Invoiced"`, updates pipeline |
| Funded | "Mark client paid →" | Updates pipeline |
| Script approved | "Mark script approved →" | Updates pipeline |
| Content approved | "Mark content approved →" | Updates pipeline |
| Timer | "Payment eligible in X days" | Static countdown display |
| Paid | "Mark creator paid →" | `handleMarkPaid(idx)` — sets `creatorPaid = "Yes"` |

`handlePipelineStep(idx, step)`: Finds order by index, marks step complete with today's date, advances to next step. Updates `orders` state only — no persistence.

**Mock orders with payment pipelines (2 records):**
- Sarah Johnson: Invoice complete (Apr 23), Funded complete (Apr 24), Script approved, content pending
- Emma Davis: Invoice complete (Apr 24), Funded pending

---

#### TAB 3 — CREATOR BENCH

**Description text:** "This bench grows with every campaign. Creators here are available for future activations."

**Search input:** Free text, filters by `creator` and `handle` fields.

**Filter buttons:** All · Ordered · Waitlisted · Passed · Passed back

**Table columns:** Creator · Handle · Level · Niche tags (colored chips) · Final bid · Campaign status badge · Last active

**Mock bench creators (6):**

| Creator | Handle | Level | Tags | Status |
|---|---|---|---|---|
| Sarah Johnson | @sarahjstyle | 4 | Fashion, Lifestyle | Ordered |
| Emma Davis | @emmastyle | 5 | Luxury, Beauty | Ordered |
| Marcus Chen | @marcusfashion | 3 | Fashion, Streetwear | Waitlisted |
| Jamie Lee | @jamielee | 3 | Wellness, Fitness | Waitlisted |
| Taylor Kim | @taylorkstyle | 2 | Beauty, Skincare | Passed |
| Alex Rivera | @alexstyle | 4 | Lifestyle, Travel | Passed back |

---

### Negotiate — `/negotiate` — INACTIVE

**File:** `src/app/components/screens/Negotiate.tsx`
**Status:** Not registered in routes. Component is built but unreachable.

**Purpose (intended):** Table of active offers with inline editing for final offer amount, status, and notes. Superseded by the scoring/negotiation panel in `Creators.tsx`.

#### State
- `loading`, `error`, `offers: Offer[]`

#### Table

Columns: Creator · Their Ask · Rec. Range · Final Offer (editable input) · Status (editable select) · Notes (editable input) · Action

Action button:
- If status "Ready to Score": "→ Qualify" (teal) — would navigate to `/qualify` (also inactive)
- Else: "Lock bid" (amber outline)

---

### Qualify — `/qualify` — INACTIVE

**File:** `src/app/components/screens/Qualify.tsx`
**Status:** Not registered in routes. Component is built but unreachable.

**Purpose (intended):** Form-based creator scoring. Superseded by scoring panel in `Creators.tsx`.

#### Table

Expandable rows. Each row shows: Creator · Handle · Stage badge · Followers · Offer · Score badges (T#, C#, A#)

Expanded row shows scoring form:
- Production Tier: 1–5 buttons
- XW Category 1: Select
- Content Match: 1–5 buttons
- Audience Fit: 1–5 buttons
- Notes: textarea
- "Save & send to client" button (teal)

---

### Pipeline alt — `/pipeline` — INACTIVE

**File:** `src/app/components/screens/Pipeline.tsx`
**Status:** Not registered in routes.

**Purpose (intended):** Alternate pipeline table with Sendgrid status and "ready to negotiate" flags. Has batch action buttons (`selectedIds` + batch buttons). Superseded by `Creators.tsx`.

#### Key difference from Creators.tsx

This screen has working batch action buttons:
- "Activate Sendgrid (N)" — outline button
- "Mark ready to negotiate (N)" — teal button
Both are disabled if `selectedIds` is empty.

---

### Pending Approval — `/pending-approval` — INACTIVE

**File:** `src/app/components/screens/PendingApproval.tsx`
**Status:** Not registered in routes. Dashboard "View" button still points to this path (broken).

**Purpose (intended):** Ops view of creators ready to send to Lead. Superseded by `Approvals.tsx`.

#### Table

Columns: Checkbox · Creator · Handle · Level · Final Bid · Brief Match · Audience Fit · Sent to Lead · Action ("Send to Lead →")

**Batch button:** "Send all selected → (N)" — disabled if nothing selected.

---

## 9. Shared Components

---

### CreatorSidePanel

**File:** `src/app/components/CreatorSidePanel.tsx`
**Used by:** `Creators.tsx`
**Width:** Fixed 600px, slides in from right, overlays content

**Props:**
```typescript
{
  creator: any;
  onClose: () => void;
}
```

**Internal state:**

| Variable | Type | Default |
|---|---|---|
| `activeTab` | `"profile" \| "score" \| "negotiate"` | `"profile"` |
| `scores` | object | `{ productionTier: 0, contentMatch: 0, audienceFit: 0, category1: "", category2: "", notes: "", whyXWRecommends: "" }` |
| `negotiation` | object | `{ counterOffer: "", status: "Pending Review", notes: "", finalBidLocked: false }` |

**Tab: Profile**
- Followers, Size (hardcoded country/gender/email/phone)
- Instagram handle (linked to `https://instagram.com/[handle]`)
- Categories (hardcoded)

**Tab: Score**
Fields:
- Production Tier: 5 buttons (1–5), highlights selected
- Content Match: 5 buttons (1–5)
- Audience Fit: 5 buttons (1–5)
- XW Category 1 & 2: Select (Fashion, Beauty, Lifestyle, Fitness)
- Notes: textarea
- Why XW recommends: textarea (labeled "Visible to Lead")

Save button behavior:
- If any score = 0: "Save scores" (outline)
- If all scores > 0: "Save & move to negotiation →" (teal)
- `onClick`: Saves `scores` to local state only. **No persistence.**

**Tab: Negotiate**

| Field | Notes |
|---|---|
| Their ask | Display only (from `creator.theirAsk`, formatted in teal) |
| Recommended range | Display only (from `calculateRecommendedRange(creator.theirAsk)`) |
| Counter offer | Number input |
| Status | Select: Pending Review · Negotiating · Ready to Score |
| Notes | textarea |

Buttons:
- "Lock final bid →" (amber outline): Toggles `negotiation.finalBidLocked`. When locked, shows padlock icon and disables counter offer input.
- "Send to Lead for approval →" (teal): Only shown if `finalBidLocked === true`. **No action wired — onClick is undefined.**

Static timeline at bottom: "Bid received Apr 21 · Counter sent Apr 22 · Creator responded Apr 23" — hardcoded, not dynamic.

---

### Toast

**File:** `src/app/components/Toast.tsx`

**Note:** This is a custom hand-rolled toast component. Sonner is installed but unused. These two systems coexist and are inconsistent.

**Props:**
```typescript
{
  message: string;
  onClose: () => void;
  duration?: number; // default 3000ms
}
```

**Behavior:** Mounts → sets a `setTimeout` for `duration` ms → calls `onClose`. Renders fixed to bottom-center. Has manual close X button.

**Used by:** `Approvals.tsx` (pass-back and approve actions)

---

### EmptyState

**File:** `src/app/components/EmptyState.tsx`

**Props:**
```typescript
{
  icon: LucideIcon;
  heading: string;
  description: string;
}
```

Centered display with muted icon circle, heading, and description text. No action button variant.

---

### DisconnectSheetModal

**File:** `src/app/components/modals/DisconnectSheetModal.tsx`

Uses Radix `AlertDialog`. Props: `open`, `onClose`, `onConfirm`.

- Title: "Disconnect Sheet"
- Body: "This will clear the connected sheet. Are you sure?"
- "Cancel" (outline) → `onClose()`
- "Disconnect" (destructive red) → `onConfirm()`

---

### PushToClientModal

**File:** `src/app/components/modals/PushToClientModal.tsx`

Uses Radix `Dialog`. Props: `open`, `onClose`, `creator`, `budgetWarning?`.

Displays creator summary (name, tier badge, execution price, usage rights).

Optional amber alert if `budgetWarning === true`: "Adding this creator will bring you to 94% of total budget."

- "Cancel" (outline) → `onClose()`
- "Confirm push →" (teal) → `onClose()` — **no data action wired, just closes**

---

### ImageWithFallback

**File:** `src/app/components/figma/ImageWithFallback.tsx`

Drop-in replacement for `<img>`. On `onError`, renders a gray placeholder rectangle. Use for any dynamic image content.

---

## 10. TypeScript Interfaces & Data Models

All interfaces are local to their files. There is no shared `types.ts` or `models.ts` file. Creator shape is defined differently in each screen — a known gap.

```typescript
// src/app/lib/auth.ts
type UserRole = "ops" | "lead";
interface User {
  role: UserRole;
  name: string;
}

// src/app/components/screens/Dashboard.tsx
interface DashboardData {
  campaignName: string;
  clientName: string;
  msaBudget: number;
  committed: number;
  postingStartDate: string;
  postingEndDate: string;
}

// src/app/components/screens/Brief.tsx
interface BriefData {
  campaignName: string;
  clientName: string;
  msaBudget: number;
  platform: string;
  contentFormat: string;
  postingStartDate: string;
  postingEndDate: string;
  hook: string;
  cta: string;
  complianceNotes: string;
  financialTriggerType: string;
  financialTriggerDate: string;
}

// src/app/components/screens/Approvals.tsx
interface Creator {
  id: number;
  name: string;
  handle: string;
  size: string;
  tierNum: number;
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

// src/app/components/screens/Orders.tsx
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
interface ClientSelection {
  creator: string;
  level: number;
  finalBid: number;
  sentDate: string;
  clientStatus: "Pending view" | "Viewed" | "Waitlisted" | "Ordered" | "Passed";
  lastStatusChange?: string;
}
interface BenchCreator {
  creator: string;
  handle: string;
  level: number;
  nicheTags: string[];
  finalBid: number;
  campaignStatus: "Ordered" | "Waitlisted" | "Passed" | "Passed back";
  lastActive: string;
}

// src/app/components/screens/CreatorsOrdered.tsx
interface ActivationPipeline {
  notified: { complete: boolean; date?: string };
  scriptReceived: { complete: boolean; date?: string; link?: string };
  clientReviewingScript: { complete: boolean; date?: string };
  contentReceived: { complete: boolean; date?: string; link?: string };
  clientReviewingContent: { complete: boolean; date?: string };
  clientApproved: { complete: boolean; date?: string };
  posted: { complete: boolean; date?: string };
}
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

// src/app/components/screens/Negotiate.tsx
type OfferStatus = "Pending Review" | "Negotiating" | "Ready to Score";
interface Offer {
  id: number;
  creator: string;
  theirAsk: number;
  recRange: string;
  finalOffer: number;
  status: OfferStatus;
  notes: string;
}
```

---

## 11. Scoring System

**File:** `src/app/lib/scoring.ts`

### Dimension Labels

**Production Tier (1–5):**
1. Raw · Shaky cam, no structure
2. Emerging · Improving, uneven quality
3. Practiced · Reliable, brand-safe
4. Fluent · Strong alignment, minor style gaps
5. Studio · Top performer, premium quality content

**Content Match (1–5):**
1. Brief match: Off entirely
2. Brief match: Loosely related
3. Brief match: On topic, average
4. Brief match: Strong
5. Brief match: Perfect

**Audience Fit (1–5):**
1. Audience fit: Wrong demographic
2. Audience fit: Partial overlap
3. Audience fit: Decent match
4. Audience fit: Strong
5. Audience fit: Ideal

**Short labels** (used in table cells via `TIER_SHORT`, `CONTENT_MATCH_SHORT`, `AUDIENCE_FIT_SHORT`):
- Tier: Raw · Emerging · Practiced · Fluent · Studio
- Content: Off brief · Loose · Average · Strong · Perfect
- Audience: Wrong · Partial · Decent · Strong · Ideal

### Recommended Range Calculator

`calculateRecommendedRange(ask: number): string`

Returns a formatted string like `"$200–$300"`. Rounded to nearest $50.

| Ask range | % of ask used |
|---|---|
| ≤ $500 | 60–80% |
| $501–$800 | 50–60% |
| $801–$1,500 | 40–60% |
| $1,501–$3,000 | 40–50% |
| $3,001–$7,000 | 30–50% |
| > $7,000 | 25–40% |

---

## 12. Mock API & Data Layer

**File:** `src/app/lib/mockApi.ts`

### `fetchSheetData(sheetId, tab)`

Fake async function. Ignores `sheetId`. Returns mock data for the given `tab` string after ~800ms (simulated via `setTimeout`).

### Mock Tab Data

| Tab name | Content |
|---|---|
| `Campaign_Brief` | Single campaign record (see below) |
| `Supply_Pipeline` | 6 creators with negotiation stage data |
| `Net_New_Offers` | 4 creators with ask/offer amounts |
| `Score_Creators` | 4 creators with scoring dimensions |
| `Campaign_Orders` | 5 creators with payment + content delivery status |

### Mock Campaign (Campaign_Brief)

```
campaignName: "Xrossworld Summer 2024"
clientName: "StyleBrand Co"
msaBudget: 125000
platform: "Instagram"
contentFormat: "Reel 30-60s"
postingStartDate: "2024-08-15"
postingEndDate: "2024-09-15"
hook: "Show your audience how you get ready using only [Product]"
cta: "Link in bio — use code XROSS15 for 15% off"
complianceNotes: "Must disclose #ad. No competitor brands visible. No alcohol."
financialTriggerType: "Wire Received"
financialTriggerDate: "2024-07-01"
```

### Additional Mock Data (hardcoded in screen components, NOT in mockApi.ts)

| File | Data defined inside |
|---|---|
| `Creators.tsx` | 7 pipeline creators |
| `Approvals.tsx` | 2 pending approval creators |
| `Orders.tsx` | 6 client selections, 6 bench creators, 2 orders with payment pipelines |
| `CreatorsOrdered.tsx` | 3 activations with partial pipeline completion |
| `Import.tsx` | 3 recent import history records |
| `PendingApproval.tsx` | 2 creators (same as Approvals mock) |

---

## 13. State Management

No global state library (no Redux, Zustand, Context API for data). All state is local `useState` within each screen component. Cross-screen data sharing uses `localStorage`.

### localStorage Keys

| Key | Type | Written by | Read by | Purpose |
|---|---|---|---|---|
| `xw_user_role` | `"ops" \| "lead"` | `Login.tsx` via `setCurrentUser()` | `RootLayout.tsx`, all screens via `getCurrentUser()` | Session / role |
| `xw_sheet_id` | `string` | `SheetConnector.tsx` | `mockApi.ts` (ignored), `RootLayout.tsx` | Sheet connection status |
| `xw_approvals_count` | `number` (stringified) | `Approvals.tsx` | `RootLayout.tsx` | Sidebar badge count |
| `xw_passed_back_creators` | `JSON string` (array) | `Approvals.tsx` | `Creators.tsx` | Pass-back reason awareness |

### State per Screen (summary)

| Screen | Key state variables |
|---|---|
| RootLayout | `sidebarOpen`, `hasSheet`, `disconnectModalOpen`, `approvalsBadgeCount` |
| Login | `selectedRole`, `password`, `error` |
| SheetConnector | `sheetUrl`, `connected`, `sheetName`, `disconnectModalOpen` |
| Dashboard | `loading`, `error`, `data` |
| Brief | `loading`, `saving`, `importing`, `brief`, `docUrl`, `showOverwriteModal` |
| Import | `uploading`, `uploadProgress`, `importResult`, `importing` |
| Creators (Pipeline) | `loading`, `searchQuery`, `activeFilter`, `selectedIds`, `selectedCreator`, `scoringPanelOpen`, `scoringCreator`, `scoringData`, `passedBackCreators`, `nicheSearchQuery`, `dismissedAutoFlags`, `urgencyBannerDismissed`, `expandedCreatorId` |
| CreatorsOrdered (Activations) | `expandedId`, `activations` |
| Approvals | `expandedRowId`, `passBackPopoverId`, `passBackReason`, `passBackError`, `toastMessage`, `visibleCreators`, `levelLegendOpen`, `sentToClientExpanded`, `passedBackExpanded`, `approvedCreators`, `passedBackCreators` |
| Orders | `loading`, `error`, `orders`, `expandedRowIdx`, `activeTab`, `benchSearchQuery`, `benchFilter` |

---

## 14. What's Connected vs Mock

| Feature | Status | Notes |
|---|---|---|
| Google Sheets read | Mock | `fetchSheetData()` ignores the sheet ID and returns hardcoded data |
| Google Sheets write | Not built | No write/update/append path exists anywhere |
| Authentication | Mock | Hardcoded passwords, localStorage session |
| Brief save | Fake | 1200ms delay, then nothing happens |
| Brief import from Google Doc | Fake | 1500ms delay, fills fields with hardcoded demo values |
| CSV upload | Fake | Progress bar simulation, no file is read |
| Sheet import (Latest_Export) | Fake | 1500ms delay, hardcoded result counts |
| Scoring save | Fake | Saves to local `scoringData` state, lost on navigation |
| Push to Lead approval | Fake | Opens scoring panel; creator is not actually submitted anywhere |
| Approve creator | Fake | Moves creator within Approvals.tsx local state only; lost on navigation |
| Pass back creator | Partially real | Saves to `localStorage["xw_passed_back_creators"]` — read by Creators.tsx |
| Approvals badge | Partially real | Synced via localStorage + storage event listener |
| Payment pipeline advance | Fake | Updates `orders` state array only; lost on navigation or reload |
| Activation pipeline advance | Fake | Updates `activations` state array only; lost on navigation or reload |
| Export orders | Stub | Button exists, no file generated |
| Sync client selections | Fake | Loading spinner, no data changes |

---

## 15. Broken, Incomplete & Unconnected Features

### Confirmed Bugs

| Issue | Location | Detail |
|---|---|---|
| Dashboard "View" button 404s | `Dashboard.tsx` — Ops view, "Ready for Lead" card | Navigates to `/pending-approval` which is not a registered route |
| Lead dashboard action links non-functional | `Dashboard.tsx` — Lead view, all 4 "action required" items | Links render but have no `onClick` or `href` |
| "Send to Lead for approval →" button | `CreatorSidePanel.tsx` — Negotiate tab | Button only shows if `finalBidLocked === true` but has no `onClick` handler — does nothing |
| Orders badge hardcoded | `RootLayout.tsx` — Lead nav | "Orders" shows badge count `15` — hardcoded, never changes |
| All primary action buttons open scoring panel | `Creators.tsx` | "Send to Lead →", "Mark final bid →", etc. all call `openScoringPanel()` instead of their labeled action |

### Data Disconnects (cross-screen state not wired)

| Disconnect | Detail |
|---|---|
| Creators → Approvals | When Ops "pushes to Lead" from Creators.tsx, nothing is added to Approvals.tsx. The approval queue is static mock data. |
| Approvals → Orders | When Lead approves a creator, nothing is added to Orders.tsx client selections. Approved creators live only in Approvals.tsx local state. |
| Import → Creators | When import completes, no creators are added to the Pipeline screen. The pipeline uses its own static mock data. |
| Brief save → anywhere | Brief changes are not reflected anywhere else in the app. |
| Activation pipeline → persistent | Pipeline step advances are lost on any navigation away from the screen. |
| Payment pipeline → persistent | Same as activation — local state only. |

### Incomplete Features

| Feature | Status |
|---|---|
| Route-level access guards | Not implemented — sidebar hiding is the only enforcement |
| Batch actions in Pipeline | `selectedIds` state exists in Creators.tsx but no batch action UI exists there (it's in the inactive Pipeline.tsx) |
| "View history →" link in creator row | Renders as a link but has no action |
| "Follow up →" in Orders client selections tab | Button renders for waitlisted creators but has no action |
| PushToClientModal "Confirm push →" | Closes the modal but performs no data action |
| CreatorSidePanel profile tab | Country, gender, email, phone, categories are all hardcoded strings — not from creator data |
| CreatorSidePanel negotiate tab timeline | "Bid received · Counter sent · Creator responded" is hardcoded, not dynamic |
| Toast system | Two parallel systems: custom `Toast.tsx` (used in Approvals) and Sonner (installed but never used) |
| Multi-campaign support | Everything assumes one active campaign — no campaign switcher |
| Audit log / history | No record of who did what or when, beyond static fake timestamps |
| Notifications | No email, Slack, or in-app notification system |
| Shared Creator type | Creator shape is redefined in each screen — no shared type file |
| Test coverage | Zero tests |

---

## 16. Cross-Role Handoff Points

These are the intended moments where data passes from one role's workflow to the other's. Most are UI-complete but data-disconnected.

| Handoff | From | To | Current status |
|---|---|---|---|
| Ops submits creator for approval | Creators.tsx "Send to Lead →" button | Approvals.tsx pending queue | **Broken** — button opens scoring panel, nothing is added to Approvals |
| Lead approves creator | Approvals.tsx "Approve" button | Orders.tsx client selections | **Broken** — creator is moved in Approvals local state only |
| Lead passes back creator | Approvals.tsx "Pass Back" popover | Creators.tsx pass-back banner | **Partially working** — localStorage handoff works, Creators.tsx reads it and shows badge |
| Client orders creator | Orders.tsx client status changes | CreatorsOrdered.tsx activations list | **Not built** — no mechanism to move a client-ordered creator into activations |
| Ops logs activation step | CreatorsOrdered.tsx pipeline advance | (Would update delivery status visible to Lead) | **Not connected** — Lead has no visibility into activation pipeline |
| Lead advances payment step | Orders.tsx payment pipeline | (Would update creator payment records) | **Fake** — local state only |
