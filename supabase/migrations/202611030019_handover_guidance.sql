alter table app_private.collection_points
  add column entrance_label text check(length(entrance_label) <= 120),
  add column handover_instructions text check(length(handover_instructions) <= 600),
  add column contact_phone text check(contact_phone ~ '^\+?[0-9]{7,15}$');
