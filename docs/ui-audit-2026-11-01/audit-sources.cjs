const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=__dirname, read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const inventory=read(path.join(dir,'figma-live-inventory.json'));
const baseline=read('docs/figma-fidelity/coverage.json');
const previous=read('docs/ui-progress-evidence-2026-10-31/figma-live-inventory-final.json');
const routes=read(path.join(dir,'routes.json'));
function matchRoute(url){const p=url.split('?')[0];return [...routes].sort((a,b)=>(a.pattern.includes('[')?1:0)-(b.pattern.includes('[')?1:0)).find(r=>{const parts=r.pattern.split('/').map(s=>s.startsWith('[')?'[^/]+':s);return new RegExp('^'+parts.join('/')+'$').test(p)});}
function group(f){const s=f.implementation.source;
 if(s.endsWith('AuthForm.tsx'))return 'Đăng nhập / đăng ký';
 if(s.includes('Onboarding'))return 'Onboarding';
 if(s.includes('/auth/'))return 'Khôi phục / bảo mật tài khoản';
 if(s.includes('/home/'))return 'Trang chủ';
 if(s.includes('/collection/'))return 'Thu gom / hành trình';
 if(s.includes('/handbook/'))return 'Sổ tay rác';
 if(s.includes('/scan/'))return 'Quét / kết quả phân loại';
 if(s.includes('/rewards/'))return 'Điểm / đổi quà';
 if(s.includes('/events/'))return 'Hoạt động';
 if(s.includes('/content/'))return 'Tin tức';
 if(s.includes('/community/'))return 'Cộng đồng / soạn bài';
 if(s.includes('/notifications/'))return 'Thông báo';
 if(s.includes('/messages/'))return 'Tin nhắn';
 if(s.includes('/assistant/'))return 'Trợ lý';
 if(s.includes('BackupedGame'))return 'Trò chơi';
 if(s.includes('/profile/'))return 'Cá nhân / cài đặt / thành tích';
 if(f.nodeId==='391:25009')return 'Thống kê';
 return 'Khung phụ';
}
const groupReasons={
 'Đăng nhập / đăng ký':'Còn AuthForm và asset gốc; giao diện gần thiết kế hơn nhóm khác nhưng nội dung phiên/validation/provider đã đổi. Cần so full-frame từng trạng thái; chưa nghiệm thu khớp hoàn toàn.',
 'Onboarding':'10 frame step trước đây bị gộp vào một OnboardingScreen; không đọc step; không còn các màn REDUCE/REUSE/RECYCLE và hình minh họa theo từng bước.',
 'Khôi phục / bảo mật tài khoản':'Form dùng Screen/Field chung thay layout riêng của thiết kế. OTP một ô thay trạng thái thiết kế; connected-account hiện là danh sách phiên đăng nhập, khác màn liên kết Google/Facebook.',
 'Trang chủ':'Hero dùng icon lá và thẻ chữ; thiếu bố cục banner minh họa, avatar, lưới 4 lối tắt, thẻ ví và thẻ hoạt động theo Figma. Sáu MenuItem xếp dọc thay lối tắt.',
 'Thu gom / hành trình':'Màn live dùng form, MenuItem và Card; không render bản đồ/pin/lớp điều hướng theo frame. Directions/navigation/route gộp RouteScreen; provider đường đi/ETA chưa mở.',
 'Sổ tay rác':'Landing/list/category/types dùng chung HandbookScreen, không còn lưới minh họa hay layout phân loại riêng; kind bị bỏ qua. Chi tiết dùng chữ hướng dẫn trong Card.',
 'Quét / kết quả phân loại':'Màn scan là nút camera/chọn ảnh, preview thiết bị và tra cứu tay; không còn các scene kết quả/loading/chi tiết thiết kế. Nhận diện AI chưa mở.',
 'Điểm / đổi quà':'Dùng ví/catalog/history dạng Card/MenuItem chung; không đọc frame để hiện các biến thể điểm danh, nhắc, modal xác nhận/success; chương trình thưởng/đổi thưởng chưa mở.',
 'Hoạt động':'Danh sách và chi tiết dùng MenuItem/Card chữ; không có hero/ảnh và các biến thể quan tâm như Figma. Calendar dùng nhập YYYY-MM thay lưới lịch. Vé/nhắc/tổng kết hiển thị thông báo giới hạn; đăng ký không còn form thiết kế.',
 'Tin tức':'Landing/search/briefs dùng NewsScreen chung; không có hero/grid. ArticleScreen render block.text, không dựng ảnh/bố cục riêng. Lịch xanh nối EventsScreen; reading-list trùng saved; modal quan tâm không còn.',
 'Cộng đồng / soạn bài':'Feed dùng MenuItem; frame không được đọc nên không mở các biến thể thành viên/lọc/chi tiết/overlay theo link cũ. Composer hiện là text + public/private, thiếu các bố cục ảnh/vị trí/cảm xúc/camera/preview.',
 'Thông báo':'Một NotificationsScreen danh sách Card và nút đã đọc; không đọc frame; thiếu bộ lọc, màn cài đặt theo nhóm và các biến thể như thiết kế.',
 'Tin nhắn':'Link /messages mở danh sách hội thoại, không đọc frame để mở chat/emoji/tệp/ảnh/ghi âm. Conversation hiện riêng ở /conversation bằng Card chữ; không có các panel đính kèm thiết kế.',
 'Trợ lý':'AssistantScreen là form câu hỏi sau RequireAuth; không có chat bubble và panel giọng nói theo 11 frame. Dịch vụ AI chưa mở.',
 'Trò chơi':'GamesScreen chỉ tải /v1/games và thông báo chưa mở; không có danh sách game, tạo phòng, phòng chờ, gameplay hay kết quả theo 10 frame.',
 'Cá nhân / cài đặt / thành tích':'Dùng Screen/Card/MenuItem/form chung; không còn profile có avatar/progress/cards hay các SettingsOverlay; overlay bị bỏ qua. Thành tích chưa có hệ thống huy hiệu mở.',
 'Thống kê':'StatisticsScreen chỉ có ba Card số liệu; không có đồ thị/lưới thống kê và bố cục dài như frame.',
 'Khung phụ':'Route /design-preview đã bị gỡ; khung phụ này không còn đường dẫn runtime theo mapping cũ.'
};
const frames=inventory.children.filter(n=>n.type==='FRAME').map(n=>{
 const old=baseline.frames.find(f=>f.nodeId===n.id);if(!old)throw Error('Missing baseline '+n.id);
 const route=matchRoute(old.implementation.route),g=group(old);
 const status=!route?'ROUTE_REMOVED':g==='Đăng nhập / đăng ký'?'AUTH_PARTIAL':'UI_CHANGED';
 const ignored=[...new URL(old.implementation.route,'http://local').searchParams.keys()].filter(k=>['preview','frame','step','overlay','expanded','interested','feedback','view','state'].includes(k));
 return {nodeId:n.id,name:n.name,width:n.width,height:n.height,group:g,status,reason:groupReasons[g],
 figmaURL:'https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id='+n.id.replace(':','-'),
 historicalRoute:old.implementation.route,historicalSource:old.implementation.source,historicalSourceExists:fs.existsSync(old.implementation.source),
 currentRoutePattern:route?.pattern??null,currentRouteFile:route?.file??null,currentComponent:route?.component??null,currentSource:route?.target??null,
 ignoredHistoricalParams:ignored,historicalReference:old.reference?path.posix.join('docs/figma-fidelity',old.reference):null,
 evidence:'Static source/route review for this frame; browser capture is guest route coverage, not acceptance of every frame state.'};
});
const count=(rows,key)=>rows.reduce((a,r)=>(a[r[key]]=(a[r[key]]||0)+1,a),{});
const report={auditDate:'2026-11-01',fileKey:'7GCLABwia0mauoszRi0Vtt',pageId:inventory.pageId,
 scope:'All 211 direct FRAME nodes on backuped + all 66 current app routes. 12 non-FRAME direct nodes are not screen acceptance targets.',
 summary:{frames:frames.length,routes:routes.length,historicalSourceMissing:frames.filter(f=>!f.historicalSourceExists).length,byStatus:count(frames,'status'),byGroup:count(frames,'group'),fullFrameVisualAcceptance:'NOT_ESTABLISHED'},
 inventoryDelta:{added:inventory.children.filter(n=>n.type==='FRAME'&&!previous.children.some(p=>p.id===n.id)).map(n=>n.id),removed:previous.children.filter(n=>n.type==='FRAME'&&!inventory.children.some(p=>p.id===n.id)).map(n=>n.id),dimensionChanged:inventory.children.filter(n=>n.type==='FRAME').filter(n=>{const p=previous.children.find(p=>p.id===n.id);return p&&(p.width!==n.width||p.height!==n.height)}).map(n=>n.id)},
 sourceFingerprint:routes.map(r=>({file:r.file,sha256:crypto.createHash('sha256').update(fs.readFileSync(r.file)).digest('hex'),target:r.target,targetSha256:r.target&&fs.existsSync(r.target)?crypto.createHash('sha256').update(fs.readFileSync(r.target)).digest('hex'):null})),
 frames};
if(frames.length!==211||routes.length!==66)throw Error('Unexpected coverage');
fs.writeFileSync(path.join(dir,'frame-audit.json'),JSON.stringify(report,null,2));
const esc=s=>String(s??'—').replaceAll('|','/').replaceAll('\n',' ');
let md='# Ma trận 211 frame — 01/11/2026\n\nNguồn: kiểm kê Figma live trang backuped và route/source hiện tại. Đây là đối chiếu cấu trúc và tính sẵn có của state; không phải điểm số pixel similarity.\n\nAUTH_PARTIAL: còn form gần thiết kế, cần nghiệm thu ảnh; UI_CHANGED: bố cục/state thay đổi; ROUTE_REMOVED: không còn route.\n\n';
for(const [g,total] of Object.entries(report.summary.byGroup)){
 md+='## '+g+' ('+total+')\n\n'+groupReasons[g]+'\n\n| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |\n| --- | --- | --- | --- | --- |\n';
 for(const f of frames.filter(f=>f.group===g))md+='| ['+esc(f.nodeId+' · '+f.name)+']('+f.figmaURL+') | '+esc(f.historicalRoute)+' | '+esc(f.currentComponent)+' | '+f.status+' | '+esc(f.ignoredHistoricalParams.join(', '))+' |\n';
 md+='\n';
}
fs.writeFileSync(path.join(dir,'frame-matrix.md'),md);
console.log(JSON.stringify(report.summary,null,2));
console.log(JSON.stringify(report.inventoryDelta,null,2));
