You are updating an existing React + TypeScript + Vite + Tailwind admin app. 
Do NOT rebuild from scratch. Make targeted changes only. Reference existing 
files by name. Preserve all existing UI, styling, and design tokens exactly.

The app uses:
- React Router 7
- Tailwind CSS 4
- shadcn/ui (Radix primitives)
- Supabase JS client
- Existing theme in src/styles/theme.css (primary: #038B97 teal, secondary: #E3FF27)

Environment variables available:
- GOOGLE_SERVICE_ACCOUNT_KEY (full service account JSON as string)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Supabase project URL: https://ywtihyqrckohactwsolp.supabase.co
Google Sheet ID: 1Kum5bwpO5AELPHvxLqP2H9csHDTUthAwEqPzulImifE
Sheet tab to read: Latest_Export

---

## CHANGE 1 — Create src/app/lib/supabase.ts

Create this file:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## CHANGE 2 — Create src/app/lib/sheetsApi.ts

This is the real Google Sheets reader. It replaces mockApi.ts for imports.
Use Web Crypto API to sign JWT — no external libraries.

```ts
async function getAccessToken(): Promise<string> {
  const raw = import.meta.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const key = JSON.parse(raw)
  const now = Math.floor(Date.now() / 1000)

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = btoa(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }))

  const signingInput = `${header}.${claim}`

  // Import private key
  const pemBody = key.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')
  const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`

  // Exchange for access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })
  const data = await res.json()
  return data.access_token
}

export async function fetchLatestExport(sheetId: string): Promise<Record<string, string>[]> {
  const token = await getAccessToken()
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Latest_Export`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  const [headers, ...rows] = data.values as string[][]
  return rows.map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  )
}
```

---

## CHANGE 3 — Create src/app/components/screens/Campaigns.tsx

New screen. Add to routes as / (make this the new root).
Move current / (Dashboard) to /dashboard.

The Campaigns screen:

- Page title: "Campaigns"
- Top right: "+ New Campaign" button (primary teal)
- Fetch campaigns from Supabase `campaigns` table on mount
- Show campaigns as cards in a responsive grid (3 cols desktop, 1 col mobile)
- Each card:
  - Campaign name (bold, large)
  - Client name (muted)
  - Status badge: Draft (gray) / Active (teal) / Completed (muted)
  - Creator count (fetch count from `creators` table where campaign_id matches)
  - Date created (relative)
  - "Open Pipeline →" button → navigates to /creators?campaign={id}
- Empty state: use existing EmptyState component, heading "No campaigns yet", 
  description "Create your first campaign to get started."
- Loading state: 3 skeleton cards

"+ New Campaign" opens a Radix Dialog modal with:
  - Campaign name input (required)
  - Client name input (required)
  - Google Sheet URL input (required) — extract sheet ID with regex /\/d\/([a-zA-Z0-9-_]+)\//
  - Brief textarea (optional)
  - "Create Campaign" button → INSERT into Supabase `campaigns` table:
    { name, client_name, sheet_id, brief, status: 'Draft', created_at: now }
  - On success: close modal, refetch campaigns, show toast "Campaign created"
  - On error: show inline error message

---

## CHANGE 4 — Update src/app/components/screens/Import.tsx

Replace the fake import with real Sheets + Supabase logic.

Add at top of component:
- Read campaign_id from URL params or localStorage['xw_campaign_id']
- Read sheet_id from Supabase campaigns table where id = campaign_id

Replace handleSheetImport() with:

```ts
async function handleSheetImport() {
  setImporting(true)
  try {
    // 1. Fetch campaign's sheet_id from Supabase
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('sheet_id')
      .eq('id', campaignId)
      .single()

    // 2. Fetch Latest_Export tab
    const rows = await fetchLatestExport(campaign.sheet_id)

    // 3. Get existing creator handles for this campaign
    const { data: existing } = await supabase
      .from('creators')
      .select('handle')
      .eq('campaign_id', campaignId)

    const existingHandles = new Set(existing?.map(c => c.handle) ?? [])

    // 4. Filter net new
    const netNew = rows.filter(row => !existingHandles.has(row['Handle'] ?? row['handle']))

    // 5. Insert net new into Supabase creators table
    if (netNew.length > 0) {
      await supabase.from('creators').insert(
        netNew.map(row => ({
          campaign_id: campaignId,
          handle: row['Handle'] ?? row['handle'],
          name: row['Name'] ?? row['name'] ?? '',
          followers: parseInt(row['Followers'] ?? '0'),
          category: row['Category'] ?? row['category'] ?? '',
          email: row['Email'] ?? row['email'] ?? '',
          status: 'New',
          created_at: new Date().toISOString()
        }))
      )
    }

    setImportResult({
      newCreators: netNew.length,
      duplicates: rows.length - netNew.length,
      inNegotiation: 0
    })
  } catch (err) {
    console.error(err)
    // show error toast
  } finally {
    setImporting(false)
  }
}
```

---

## CHANGE 5 — Update src/app/components/screens/Creators.tsx (Pipeline screen)

Replace mock creators with real Supabase data.

On mount, fetch creators:
```ts
const { data: creators } = await supabase
  .from('creators')
  .select('*')
  .eq('campaign_id', campaignId)
  .order('created_at', { ascending: false })
```

Where campaignId comes from URL params: /creators?campaign={id}

Replace handleSaveScoring() in the scoring panel Save button:
```ts
await supabase.from('creators').update({
  score: scoringData.score,
  bid: scoringData.bid,
  production_tier: scoringData.productionTier,
  content_match: scoringData.contentMatch,
  audience_fit: scoringData.audienceFit,
  niche_tags: scoringData.nicheTags,
  ops_notes: scoringData.opsNotes,
  status: 'Scored',
  updated_at: new Date().toISOString()
}).eq('id', scoringCreator.id)
```

Fix "Push to Fundify" batch action (currently missing from this screen — add it):
- Show bottom action bar when selectedIds.length > 0
- "Push to Fundify" button disabled if any selected creator has score = null
- Tooltip on disabled state: "All selected creators must be scored first"
- On click:
```ts
await supabase.from('creators').update({
  status: 'Pushed',
  pushed_at: new Date().toISOString()
}).in('id', selectedIds)

await supabase.from('client_selections').insert(
  selectedCreators.map(c => ({
    campaign_id: campaignId,
    creator_id: c.id,
    handle: c.handle,
    name: c.name,
    execution_price: c.bid,
    production_tier: c.production_tier,
    decision: 'Pending',
    pushed_at: new Date().toISOString()
  }))
)
```
- On success: refetch creators, clear selectedIds, show toast "X creators pushed to Fundify"

---

## CHANGE 6 — Update src/app/components/screens/Orders.tsx (Client View tab)

Tab 1 "Client Selections" — replace mock data with Supabase:

```ts
const { data: selections } = await supabase
  .from('client_selections')
  .select('*, creators(*)')
  .eq('campaign_id', campaignId)
  .order('pushed_at', { ascending: false })
```

Auto-refresh every 30 seconds:
```ts
useEffect(() => {
  fetchSelections()
  const interval = setInterval(fetchSelections, 30000)
  return () => clearInterval(interval)
}, [campaignId])
```

---

## CHANGE 7 — Update src/app/components/screens/CreatorsOrdered.tsx (Production)

Replace mock activations with Supabase:

```ts
const { data: activations } = await supabase
  .from('activations')
  .select('*, creators(*)')
  .eq('campaign_id', campaignId)
```

Replace handlePipelineStep() to persist to Supabase:
```ts
await supabase.from('activations').update({
  [`${step}_at`]: new Date().toISOString(),
  stage: nextStage
}).eq('id', activationId)
```

---

## CHANGE 8 — Create src/app/components/screens/Settings.tsx

New screen at route /settings.

Two sections:

TEAM section:
- Fetch from Supabase `user_profiles` table
- Table: Name · Email · Role badge (Admin/Ops/Viewer) · Last active
- "+ Invite Team Member" button → modal: email input + role select → 
  supabase.auth.admin.inviteUserByEmail() + insert into user_profiles

CLIENT ACCESS section:
- Filter user_profiles where role = 'client'
- Table: Name · Email · Campaigns (which campaign_ids they have access to)
- "Invite Fundify" button → modal: email input → 
  supabase.auth.admin.inviteUserByEmail() with role: 'client'

---

## CHANGE 9 — Update src/app/routes.tsx

Add these routes:
```ts
{ path: '/', element: <Campaigns /> }           // new root
{ path: '/dashboard', element: <Dashboard /> }  // moved from /
{ path: '/settings', element: <Settings /> }    // new
```

Keep all existing routes exactly as-is.

---

## CHANGE 10 — Update src/app/components/RootLayout.tsx

Update Ops sidebar nav to add:
- "Campaigns" → / (Home icon) — add at top
- "Settings" → /settings (Settings icon) — add at bottom

Update Lead sidebar nav to add:
- "Settings" → /settings (Settings icon) — add at bottom

Fix these confirmed bugs:
1. Dashboard "View" button → change href from /pending-approval to /approvals
2. Lead dashboard action links → add onClick handlers that navigate to correct routes
3. Orders badge → read from Supabase client_selections count where decision='Pending' 
   instead of hardcoded 15
4. "Send to Lead for approval →" in CreatorSidePanel.tsx Negotiate tab → 
   add onClick that calls the Supabase push logic from Change 5

---

## WHAT NOT TO TOUCH

- src/styles/theme.css — do not change any tokens
- src/app/lib/scoring.ts — do not change scoring logic
- src/app/lib/auth.ts — do not change auth (we will replace this separately)
- src/app/components/screens/Brief.tsx — do not change
- src/app/components/screens/Dashboard.tsx — do not change
- src/app/components/screens/Approvals.tsx — do not change
- src/app/components/screens/Login.tsx — do not change
- All inactive screens (Negotiate, Qualify, Pipeline, PendingApproval) — do not touch
- All existing UI, layout, colors, and component structure — preserve exactly