import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { mlSecrets } from "./env.ts";

const SITE_BY_COUNTRY: Record<string, string> = {
  VE: "MLV",
  CO: "MCO",
  PE: "MPE",
  EC: "MEC",
  DO: "MDO",
};

const AUTH_HOST_BY_SITE: Record<string, string> = {
  MLV: "https://auth.mercadolibre.com.ve/authorization",
  MCO: "https://auth.mercadolibre.com.co/authorization",
  MPE: "https://auth.mercadolibre.com.pe/authorization",
  MEC: "https://auth.mercadolibre.com.ec/authorization",
  MDO: "https://auth.mercadolibre.com.do/authorization",
};

export function siteIdFromCountry(countryCode: string): string {
  return SITE_BY_COUNTRY[countryCode] ?? "MLV";
}

export function authUrlForSite(
  siteId: string,
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const base = AUTH_HOST_BY_SITE[siteId] ?? AUTH_HOST_BY_SITE.MLV;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "offline_access read write",
  });
  return `${base}?${params.toString()}`;
}

export interface MlTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
}

async function postOauthToken(body: URLSearchParams): Promise<MlTokenResponse> {
  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof json.error_description === "string"
      ? json.error_description
      : typeof json.message === "string"
      ? json.message
      : `OAuth ML falló (${res.status})`;
    const err = new Error(msg) as Error & { code?: string };
    err.code = typeof json.error === "string" ? json.error : undefined;
    throw err;
  }
  return {
    access_token: String(json.access_token),
    refresh_token: String(json.refresh_token),
    expires_in: Number(json.expires_in ?? 21600),
    user_id: Number(json.user_id),
  };
}

export async function exchangeAuthorizationCode(code: string): Promise<MlTokenResponse> {
  const secrets = mlSecrets();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: secrets.clientId,
    client_secret: secrets.clientSecret,
    code,
    redirect_uri: secrets.redirectUri,
  });
  return postOauthToken(body);
}

export async function refreshAccessToken(refreshToken: string): Promise<MlTokenResponse> {
  const secrets = mlSecrets();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: secrets.clientId,
    client_secret: secrets.clientSecret,
    refresh_token: refreshToken,
  });
  return postOauthToken(body);
}

export interface MlConnectionRow {
  id: string;
  store_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  status: string;
  site_id: string;
}

const SKEW_MS = 120_000;

export async function ensureValidAccessToken(
  admin: SupabaseClient,
  storeId: string,
): Promise<{ accessToken: string; siteId: string }> {
  const { data, error } = await admin
    .from("repmax_ml_connections")
    .select("id, store_id, access_token, refresh_token, expires_at, status, site_id")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Esta tienda no tiene MercadoLibre conectado.");

  const row = data as MlConnectionRow;
  if (row.status === "revoked") {
    throw new Error("La conexión de MercadoLibre está revocada.");
  }

  const expiresAt = new Date(row.expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt - SKEW_MS > Date.now()) {
    return { accessToken: row.access_token, siteId: row.site_id };
  }

  try {
    const tokens = await refreshAccessToken(row.refresh_token);
    const nextExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const { error: updateError } = await admin
      .from("repmax_ml_connections")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: nextExpiry,
        status: "active",
        ml_user_id: tokens.user_id,
      })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);
    return { accessToken: tokens.access_token, siteId: row.site_id };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "invalid_grant") {
      await admin
        .from("repmax_ml_connections")
        .update({ status: "expired" })
        .eq("id", row.id);
      throw new Error("La sesión de MercadoLibre venció. Vuelve a conectar la cuenta.");
    }
    throw err;
  }
}

export async function mlGet<T>(
  path: string,
  accessToken: string,
): Promise<T> {
  const res = await fetch(`https://api.mercadolibre.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json() as T & { message?: string };
  if (!res.ok) {
    const msg = typeof json.message === "string"
      ? json.message
      : `MercadoLibre ${res.status}`;
    throw new Error(msg);
  }
  return json;
}
