ALTER TABLE public.ai_usage_log
  ADD COLUMN IF NOT EXISTS cache_creation_input_tokens integer,
  ADD COLUMN IF NOT EXISTS cache_read_input_tokens integer;

COMMENT ON COLUMN public.ai_usage_log.cache_creation_input_tokens IS
  'Anthropic usage.cache_creation_input_tokens (escritura de prompt cache). Null si el call site no reporta caching.';
COMMENT ON COLUMN public.ai_usage_log.cache_read_input_tokens IS
  'Anthropic usage.cache_read_input_tokens (lectura de prompt cache). Null si el call site no reporta caching.';
