# odentalpro-server — hub ops / DB

**No es una API Express.** OdentalPro web/mobile usan Supabase Auth + PostgREST + RLS sobre tablas `odental_*`.

## Qué vive aquí

| Área                            | Uso                                                             |
| ------------------------------- | --------------------------------------------------------------- |
| `supabase/migrations/`          | SQL del producto (`odental_*`) en el proyecto compartido ZMTech |
| Edge Functions (cuando existan) | Deploy vía Supabase CLI — no JWT propio                         |

## Proyecto Supabase

`llacowjutjfefboqgfnj` (compartido con Landing y RepMAX).  
**No tocar** `contacts`, `quote_leads` ni `repmax_*`.

Mapa completo: [docs/SUPABASE.md](../../docs/SUPABASE.md).

## Deploy (ejemplo)

```bash
supabase functions deploy <nombre> --project-ref llacowjutjfefboqgfnj
```
