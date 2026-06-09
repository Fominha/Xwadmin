async function getAccessToken(): Promise<string> {
  const raw = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY
  const key = JSON.parse(raw)
  const now = Math.floor(Date.now() / 1000)

  const toBase64Url = (str: string) =>
    btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = toBase64Url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }))

  const signingInput = `${header}.${claim}`

  const privateKeyPem = key.private_key.replace(/\\n/g, '\n')
  const pemBody = privateKeyPem
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

  const jwt = `${signingInput}.${toBase64Url(String.fromCharCode(...new Uint8Array(signature)))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })
  const data = await res.json()
  return data.access_token
}

export function normalizeHandle(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok|youtube)\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/$/, '')
    .trim()
    .toLowerCase()
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
