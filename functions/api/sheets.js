export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const credentials = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const token = await getAccessToken(credentials);
    const url = new URL(request.url);
    const sheetId = url.searchParams.get("sheetId");
    const tab = url.searchParams.get("tab") || "Client_Selections";

    if (!sheetId) {
      return new Response(JSON.stringify({ error: "sheetId required" }), {
        status: 400, headers: corsHeaders
      });
    }

    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}`;
    const response = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length < 2) {
      return new Response(JSON.stringify({ rows: [] }), { headers: corsHeaders });
    }

    const headers = rows[0];
    const objects = rows.slice(1).map(row =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] || ""]))
    );

    return new Response(JSON.stringify({ rows: objects }), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders
    });
  }
}

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const signingInput = `${header}.${payload}`;
  const privateKey = await importPrivateKey(credentials.private_key);
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function importPrivateKey(pem) {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyData = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8", keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
}
