-- Preserve historical fixed results; all new scans use model predictions.
alter table app_private.scans drop constraint scans_result_mode_check;
alter table app_private.scans
  add constraint scans_result_mode_check check(result_mode is null or result_mode in ('fixed','model')),
  add column predicted_class text check(predicted_class in
    ('battery','biological','cardboard','clothes','glass','metal','paper','plastic','shoes','trash')),
  add column confidence double precision check(confidence >= 0 and confidence <= 1),
  add column model_name text,
  add constraint scans_model_result_check check(result_mode <> 'model' or
    (predicted_class is not null and confidence is not null and model_name is not null));

-- Material-level handbook entries match the model's granularity. Reuse existing
-- taxonomy where possible, without changing any user actions or ledger records.
insert into app_private.waste_categories(code,name,sort_order,handbook_key)
select 'scan-'||v.key,v.name,v.sort_order,v.key
from (values ('recycle','Tái chế',0),('organic','Hữu cơ',1),('inorganic','Vô cơ',2)) v(key,name,sort_order)
where not exists(select 1 from app_private.waste_categories c where c.handbook_key=v.key);
insert into app_private.waste_categories(code,name,sort_order)
values ('scan-special','Thu gom riêng',3) on conflict(code) do nothing;

insert into app_private.waste_materials(code,name,hazardous)
select 'scan-'||v.code,v.name,v.hazardous from (values
  ('battery','Pin',true),('biological','Hữu cơ',false),('cardboard','Bìa carton',false),
  ('clothes','Vải',false),('glass','Thủy tinh',false),('metal','Kim loại',false),
  ('paper','Giấy',false),('plastic','Nhựa',false),('shoes','Giày dép',false),('trash','Rác còn lại',false)
) v(code,name,hazardous)
where not exists(select 1 from app_private.waste_materials m where m.name=v.name and m.hazardous=v.hazardous);

insert into app_private.waste_items(code,name,category_id,material_id,icon,steps,published,synthetic,handbook_kind)
select 'scan-'||v.code,v.name,
  (select c.id from app_private.waste_categories c
   where (v.category='special' and c.code='scan-special') or c.handbook_key=v.category
   order by c.code limit 1),
  (select m.id from app_private.waste_materials m where m.name=v.material order by m.code limit 1),
  v.icon,v.steps::jsonb,true,false,v.kind
from (values
  ('battery','Pin đã qua sử dụng','special','Pin','battery-half-outline','battery',
   '["Không bỏ chung với rác sinh hoạt.","Giữ khô, tránh nhiệt và không tháo mở pin.","Mang tới nơi tiếp nhận pin hoặc đơn vị thu gom chuyên biệt."]'),
  ('biological','Rác hữu cơ','organic','Hữu cơ','leaf-outline',null,
   '["Tách túi, bao bì và vật liệu khác.","Gom riêng trong dụng cụ có nắp.","Kiểm tra vật liệu cơ sở xử lý hữu cơ tiếp nhận; không mặc định mọi thức ăn đều phù hợp ủ tại nhà."]'),
  ('cardboard','Bìa carton','recycle','Bìa carton','cube-outline','paper',
   '["Tách băng dính, xốp và vật liệu khác.","Giữ carton sạch, khô và gấp phẳng.","Hỏi nơi thu gom cách xử lý carton dính dầu mỡ."]'),
  ('clothes','Quần áo','inorganic','Vải','shirt-outline','textile',
   '["Ưu tiên tái sử dụng hoặc cho tặng đồ còn dùng được.","Giữ sạch, khô và gom riêng.","Liên hệ nơi tiếp nhận vải hoặc đơn vị thu gom địa phương."]'),
  ('glass','Thủy tinh','recycle','Thủy tinh','flask-outline','glass',
   '["Làm sạch và tách nắp nếu là bao bì.","Bọc kỹ mảnh vỡ và ghi cảnh báo.","Kiểm tra loại thủy tinh nơi thu gom tiếp nhận."]'),
  ('metal','Kim loại','recycle','Kim loại','cafe-outline','metal',
   '["Làm sạch phần thức ăn hoặc đồ uống còn lại nếu có.","Gom riêng và tránh cạnh sắc.","Kiểm tra vật phẩm kim loại nơi thu gom tiếp nhận."]'),
  ('paper','Giấy','recycle','Giấy','document-outline','paper',
   '["Tách nhựa và kim loại nếu có.","Giữ giấy sạch, khô và gom gọn.","Giấy dính dầu mỡ cần kiểm tra hướng dẫn thu gom riêng."]'),
  ('plastic','Nhựa','recycle','Nhựa','water-outline','plastic',
   '["Kiểm tra ký hiệu vật liệu và hướng dẫn trên bao bì.","Tách thức ăn và chất lỏng, làm sạch nếu phù hợp.","Xác nhận loại nhựa nơi thu gom tiếp nhận; không phải mọi loại nhựa đều được tái chế."]'),
  ('shoes','Giày dép','inorganic','Giày dép','footsteps-outline',null,
   '["Ưu tiên sửa chữa, tái sử dụng hoặc cho tặng khi còn dùng được.","Giữ khô và gom riêng thành đôi.","Hỏi nơi tiếp nhận giày dép hoặc đơn vị thu gom địa phương."]'),
  ('trash','Rác còn lại','inorganic','Rác còn lại','trash-outline',null,
   '["Kiểm tra lại để tách pin, hóa chất và vật sắc nhọn.","Không trộn vào thùng tái chế khi chưa xác định được vật liệu.","Đóng gói và giao theo hướng dẫn thu gom địa phương."]')
) v(code,name,category,material,icon,kind,steps)
on conflict(code) do nothing;
