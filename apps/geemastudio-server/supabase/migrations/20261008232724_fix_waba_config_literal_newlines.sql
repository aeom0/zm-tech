update waba_config
set config_value = jsonb_set(config_value, '{text}', to_jsonb(replace(config_value->>'text', E'\\n', E'\n')))
where tenant_id = 'zm-lash-nails'
  and config_key in ('emotional_price_cta_ext', 'haiku_emotional_selling_ctwa_ext_lift')
  and config_value->>'text' like '%' || E'\\n' || '%';
