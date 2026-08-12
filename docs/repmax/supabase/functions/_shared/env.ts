function required(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Falta el secret ${name} en Edge Functions.`);
  }
  return value;
}

export function mlSecrets() {
  return {
    clientId: required("ML_CLIENT_ID"),
    clientSecret: required("ML_CLIENT_SECRET"),
    redirectUri:
      Deno.env.get("ML_REDIRECT_URI")?.trim() ||
      "https://llacowjutjfefboqgfnj.supabase.co/functions/v1/ml-oauth-callback",
    stateSecret: required("ML_OAUTH_STATE_SECRET"),
  };
}

export function supabaseEnv() {
  return {
    url: required("SUPABASE_URL"),
    anonKey: required("SUPABASE_ANON_KEY"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
