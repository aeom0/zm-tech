ALTER TABLE appointment_services
  ADD CONSTRAINT appointment_services_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
