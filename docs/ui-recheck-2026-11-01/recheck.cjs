const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const out = __dirname;
const read = (p) => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8'));
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex');
const rel = (p) => path.relative(root, p).replaceAll('\\', '/');
const walk = (p) => fs.readdirSync(p, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)]);
const prior = read('docs/ui-audit-2026-11-01/frame-audit.json');
const progress = read('docs/ui-implementation-2026-11-01/progress.json');
const inventory = read('docs/ui-recheck-2026-11-01/figma-live-inventory.json');
const types = read('docs/ui-recheck-2026-11-01/figma-node-types.json');
// get_metadata describes GROUP as <frame>; Plugin API node.type is authoritative.
inventory.children.forEach((n) => { const actual = types.children.find((t) => t.id === n.id); if (!actual) throw Error('Missing authoritative type: ' + n.id); n.type = actual.type; });
inventory.typeSource = 'Figma Plugin API page.children; metadata used for dimensions only';
fs.writeFileSync(path.join(out, 'figma-live-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
function localModule(file, spec) {
  if (!spec.startsWith('.')) return null;
  const stem = path.resolve(path.dirname(path.resolve(root, file)), spec);
  return ['.tsx', '.ts', '/index.tsx', '/index.ts'].map((ext) => stem + ext).find((p) => fs.existsSync(p)) ?? null;
}
const app = path.join(root, 'apps/mobile/app');
const routes = walk(app).filter((f) => f.endsWith('.tsx') && !/[/\\](_layout|\+not-found)\.tsx$/.test(f)).map((file) => {
  const raw = rel(file).slice('apps/mobile/app/'.length).replace(/\.tsx$/, '');
  const pattern = '/' + raw.split('/').filter((s) => !s.startsWith('(')).join('/').replace(/(^|\/)index$/, '');
  const source = fs.readFileSync(file, 'utf8');
  const component = source.match(/export\s*\{\s*(\w+)\s+as\s+default/)?.[1] || source.match(/import\s*\{\s*(\w+)/)?.[1] || 'unknown';
  const spec = source.match(/from\s+['"]([^'"]+)['"]/)?.[1];
  const target = spec && localModule(rel(file), spec);
  let resolved = target, symbol = component;
  const exportChain = [];
  while (resolved) {
    exportChain.push(rel(resolved));
    const code = fs.readFileSync(resolved, 'utf8');
    const reexports = [...code.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)];
    let next = null;
    for (const m of reexports) for (const entry of m[1].split(',')) {
      const [original, alias] = entry.trim().split(/\s+as\s+/);
      if ((alias || original) === symbol) { next = localModule(rel(resolved), m[2]); symbol = original; }
    }
    if (!next || exportChain.includes(rel(next))) break;
    resolved = next;
  }
  return { pattern: pattern || '/', file: rel(file), component, target: target && rel(target), resolvedSource: resolved && rel(resolved), resolvedSymbol: symbol, exportChain, source, fileSha256: hash(rel(file)), sourceSha256: resolved && hash(rel(resolved)) };
});
function matchRoute(url) {
  const pathname = url.split('?')[0];
  return [...routes].sort((a,b) => Number(a.pattern.includes('[')) - Number(b.pattern.includes('['))).find((r) => new RegExp('^' + r.pattern.split('/').map((s) => s.startsWith('[') ? '[^/]+' : s).join('/') + '$').test(pathname));
}
const reasons = {
  'Hoạt động': 'Đã có khám phá, lịch tháng/tuần, một bố cục chi tiết và form đăng ký. Các biến thể chi tiết/đã lưu, bộ sưu tập, nhắc lịch, vé/check-in và tổng kết chưa đủ bố cục/state Figma; đăng ký thực tế vẫn bị cổng dịch vụ chặn.',
  'Thu gom / hành trình': 'Khám phá có bản đồ OSM và tọa độ thật. Bộ lọc, chi tiết, so sánh, hành trình, báo cáo/đề xuất vẫn dùng form/Card chung; directions/navigation/route chung RouteScreen, chưa có điều hướng/ETA theo frame.',
  'Đăng nhập / đăng ký': 'Còn bố cục AuthForm và asset gốc; Ghi nhớ tôi đã đổi thành trạng thái phiên, social sign-in chưa hỗ trợ. Chưa nghiệm thu đầy đủ trạng thái và native.',
  'Khôi phục / bảo mật tài khoản': 'Đã chỉnh quên mật khẩu, OTP, đặt/đổi mật khẩu. Kết nối Google/Facebook hiện mở danh sách phiên; khác mục đích frame. OTP/error/loading và keyboard cần nghiệm thu từng trạng thái.',
  'Cá nhân / cài đặt / thành tích': 'Đã chỉnh tổng quan cá nhân, hồ sơ, cài đặt và các overlay. PIN chưa hỗ trợ, thành tích chỉ có trạng thái chưa cấp huy hiệu. Dữ liệu/API và một số trường hồ sơ khác mẫu.',
  'Cộng đồng / soạn bài': 'Feed dùng MenuItem; không đọc frame để dựng member, filter và overlay. Composer có chữ/quyền public-private nhưng thiếu bố cục ảnh, vị trí, cảm xúc, xem trước và camera theo các frame.',
  'Thông báo': 'Một danh sách Card và thao tác đánh dấu đã đọc; không có selector frame, bộ lọc và màn cài đặt theo nhóm như thiết kế.',
  'Tin nhắn': 'Danh sách và hội thoại chữ có API thật; không có các panel emoji, ảnh, tệp và ghi âm tương ứng 16 frame.',
  'Trợ lý': 'Form câu hỏi sau xác thực, chưa có giao diện chat/giọng nói của 11 frame. Dịch vụ AI chưa mở.',
  'Trò chơi': 'GamesScreen chỉ truy vấn dịch vụ và thông báo chưa có trò chơi; thiếu danh sách, phòng chờ, gameplay và kết quả trong 10 frame.',
  'Tin tức': 'Đã chỉnh landing/hero/grid và có các tab dữ liệu. Chi tiết render text block; briefs, reading-list, tìm kiếm/chủ đề và sự kiện chưa có đủ các bố cục riêng/modal theo 22 frame.',
  'Điểm / đổi quà': 'Đã chỉnh hành trình, catalog, lịch sử và hướng dẫn. Các modal/biến thể nhận điểm, lời nhắc, xác nhận và thành công chưa đủ; chương trình cấp/đổi điểm chưa mở.',
  'Sổ tay rác': 'Đã chỉnh landing/header/grid, đọc kind và category thật. Các biến thể mở rộng và chi tiết từng vật phẩm vẫn dùng template chung, chưa nghiệm thu đầy đủ 20 frame.',
  'Quét / kết quả phân loại': 'Có camera/chọn ảnh thật và tra cứu thủ công; không có đủ scene scan/loading/kết quả/điểm theo 10 frame. Nhận diện ảnh chưa mở.',
  'Thống kê': 'Chỉ có ba Card số liệu, chưa có đồ thị/lưới và bố cục dài của frame.',
  'Trang chủ': 'Đã phục hồi bố cục hero, lối tắt, ví và phần nội dung. Dữ liệu/ảnh động lấy từ API; cần nghiệm thu geometry, font và các trạng thái.',
  'Onboarding': 'Đã có 10 bước và minh họa riêng, đọc step. Chủ đề theo enum API, không giả cấp quyền vị trí hoặc nhắc lịch; chưa nghiệm thu đầy đủ từng bước trên native.',
  'Khung phụ': 'Ba frame phụ vẫn không có route /design-preview. Chúng là khung phụ trong Figma, không tự suy ra phải đưa công cụ preview vào sản phẩm.',
};
const frames = inventory.children.filter((n) => n.type === 'FRAME').map((n) => {
  const old = prior.frames.find((f) => f.nodeId === n.id);
  if (!old) throw Error('New frame requires mapping: ' + n.id);
  const route = matchRoute(old.historicalRoute), p = progress.frames.find((f) => f.nodeId === n.id);
  if (!p) throw Error('Missing progress: ' + n.id);
  const status = !route ? 'NO_RUNTIME_ROUTE' : p.implementationStatus === 'PARTIAL_LAYOUT' ? 'PARTIAL_LAYOUT' : 'NEEDS_WORK_OR_VERIFICATION';
  return { nodeId:n.id, name:n.name, width:n.width, height:n.height, group:old.group, status, visualAcceptance:'NOT_ESTABLISHED', implementationStatus:p.implementationStatus, figmaURL:old.figmaURL, historicalRoute:old.historicalRoute, currentRoutePattern:route?.pattern??null, currentRouteFile:route?.file??null, currentComponent:route?.component??null, currentSource:route?.resolvedSource??null, resolvedSymbol:route?.resolvedSymbol??null, sourceSha256:route?.sourceSha256??null, reason:reasons[old.group], historicalReference:old.historicalReference, evidence:'Current Figma inventory and current source/route mapping; visual checks are sampled, not pixel acceptance for this frame.' };
});
const count = (rows, key) => rows.reduce((a,r) => (a[r[key]]=(a[r[key]]||0)+1,a),{});
const oldInventory = read('docs/ui-audit-2026-11-01/figma-live-inventory.json').children.filter((n) => n.type === 'FRAME');
const report = { capturedAt:new Date().toISOString(), fileKey:progress.fileKey, pageId:progress.pageId, conclusion:'NOT_FULLY_MATCHED', scope:'All direct FRAME nodes on backuped, mapped to current route/source. Full visual/state acceptance is not established.', summary:{frames:frames.length,routes:routes.length,nonFrameNodes:inventory.children.length-frames.length,byStatus:count(frames,'status'),byGroup:count(frames,'group'),partialLayouts:frames.filter((f)=>f.status==='PARTIAL_LAYOUT').length,acceptedFrames:0}, inventoryDelta:{added:frames.filter((f)=>!oldInventory.some((n)=>n.id===f.nodeId)).map((f)=>f.nodeId),removed:oldInventory.filter((n)=>!frames.some((f)=>f.nodeId===n.id)).map((n)=>n.id),dimensionChanged:frames.filter((f)=>{const n=oldInventory.find((n)=>n.id===f.nodeId);return n&&(n.width!==f.width||n.height!==f.height)}).map((f)=>f.nodeId)}, frames };
if (frames.length!==211 || routes.length!==66) throw Error('Unexpected scope; review before publishing');
fs.writeFileSync(path.join(out,'routes.json'),JSON.stringify(routes,null,2)+'\n');
fs.writeFileSync(path.join(out,'frame-audit.json'),JSON.stringify(report,null,2)+'\n');
const sourceFiles = walk(path.join(root,'apps/mobile/src')).filter((f)=>/\.(tsx?|json)$/.test(f));
fs.writeFileSync(path.join(out,'source-fingerprints.json'),JSON.stringify(sourceFiles.map((f)=>({file:rel(f),sha256:hash(rel(f))})),null,2)+'\n');
const esc=(s)=>String(s??'—').replaceAll('|','/').replaceAll('\n',' ');
let md='# Đối chiếu lại 211 frame với frontend hiện tại\n\nMỗi dòng được đối chiếu route/source. Các trạng thái dưới đây không phải tỷ lệ giống ảnh. Chưa có frame được nghiệm thu toàn bộ các state/pixel/native.\n\nPARTIAL_LAYOUT: có thay đổi bố cục, còn cần nghiệm thu. NEEDS_WORK_OR_VERIFICATION: chưa hoàn thiện hoặc chưa có bằng chứng nghiệm thu riêng; phần lý do mô tả chênh lệch cấp nhóm, không phải phép so ảnh cho từng frame. NO_RUNTIME_ROUTE: không có route khung phụ.\n';
for(const [group,total] of Object.entries(report.summary.byGroup)){
  md+='\n## '+group+' ('+total+')\n\n'+reasons[group]+'\n\n| Frame | Route hiện tại | Component / source | Kết quả |\n| --- | --- | --- | --- |\n';
  for(const f of frames.filter((f)=>f.group===group)) md+='| ['+esc(f.nodeId+' · '+f.name)+']('+f.figmaURL+') | '+esc(f.currentRoutePattern)+' | '+(f.currentSource?'['+esc(f.resolvedSymbol)+'](../../'+f.currentSource+')':'—')+' | '+f.status+' |\n';
}
fs.writeFileSync(path.join(out,'frame-matrix.md'),md);
console.log(JSON.stringify({summary:report.summary,inventoryDelta:report.inventoryDelta,sourceFiles:sourceFiles.length},null,2));
