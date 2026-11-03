-- Fixed Chai nhua flow requested by the product owner; no image upload or AI inference.
alter table app_private.scans
  add column result_mode text check(result_mode is null or result_mode='fixed'),
  add column input_kind text check(input_kind is null or input_kind in ('camera','library')),
  add column client_image_id uuid,
  add column result_item_id uuid references app_private.waste_items,
  add column confirmation_snapshot jsonb;
create unique index scans_owner_image on app_private.scans(user_id,client_image_id)
  where client_image_id is not null;
