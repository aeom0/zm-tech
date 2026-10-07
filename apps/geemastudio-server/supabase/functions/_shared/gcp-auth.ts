/** Autenticación Google Cloud (service account → access token). Mismo patrón que FCM. */

export interface GoogleServiceAccount {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
}

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

function b64url(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Lee credenciales desde secrets/env (prioridad: JSON → base64 → vars sueltas). */
export function parseGoogleServiceAccount(): GoogleServiceAccount {
  const jsonRaw = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON")?.trim();
  if (jsonRaw) return JSON.parse(jsonRaw) as GoogleServiceAccount;

  const b64 = Deno.env.get("GCP_SERVICE_ACCOUNT_BASE64")?.trim();
  if (b64) {
    const decoded = atob(b64);
    return JSON.parse(decoded) as GoogleServiceAccount;
  }

  const email = Deno.env.get("GOOGLE_CLIENT_EMAIL")?.trim();
  let privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")?.trim();
  if (email && privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
    return {
      project_id: Deno.env.get("GOOGLE_CLOUD_PROJECT_ID")?.trim(),
      client_email: email,
      private_key: privateKey,
    };
  }

  throw new Error(
    "Credenciales GCP no configuradas (GCP_SERVICE_ACCOUNT_JSON, GCP_SERVICE_ACCOUNT_BASE64 o GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY)",
  );
}

export function getGoogleProjectId(sa: GoogleServiceAccount): string {
  const fromEnv = Deno.env.get("GOOGLE_CLOUD_PROJECT_ID")?.trim();
  if (fromEnv) return fromEnv;
  if (sa.project_id) return sa.project_id;
  const match = (sa.client_email || "").match(
    /@([^.]+)\.iam\.gserviceaccount\.com/,
  );
  if (match?.[1]) return match[1];
  throw new Error("No se pudo resolver GOOGLE_CLOUD_PROJECT_ID");
}

export async function getGoogleAccessToken(
  scope: string = CLOUD_PLATFORM_SCOPE,
): Promise<string> {
  const sa = parseGoogleServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope,
  };

  const encoder = new TextEncoder();
  const toSign = b64url(JSON.stringify(header)) + "." +
    b64url(JSON.stringify(payload));
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(toSign),
  );
  const jwt = toSign + "." +
    b64url(String.fromCharCode(...new Uint8Array(signature)));

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google OAuth token error: ${tokenRes.status} ${err}`);
  }
  const tokenData = await tokenRes.json();
  return tokenData.access_token as string;
}
