ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS party_booking text;
COMMENT ON COLUMN whatsapp_sessions.party_booking IS 'JSON PartyBooking: multi-cita / terceros in-bot (together | guest_only)';
