alter table app_private.collection_points
  add column website_url text
  check(length(website_url) <= 2048 and website_url ~ '^https?://[^[:space:]]+$');
