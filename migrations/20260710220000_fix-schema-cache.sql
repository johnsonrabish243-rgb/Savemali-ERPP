-- Force PostgREST schema cache reload so new columns (phone, timezone, etc.) are immediately visible
SELECT pg_notify('pgrst', 'reload schema');
