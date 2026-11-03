alter table app_private.routes add column material_ids uuid[] not null default '{}';
alter table app_private.routes add constraint routes_material_count check(cardinality(material_ids) <= 30);
