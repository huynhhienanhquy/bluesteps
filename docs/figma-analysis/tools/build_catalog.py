"""Build reviewable catalogs from the captured Figma evidence (read-only inputs)."""
from pathlib import Path
import json
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'evidence'
FILE_KEY = '7GCLABwia0mauoszRi0Vtt'

def read(name):
    return json.loads((EVIDENCE / name).read_text(encoding='utf-8'))

def link(node):
    return f'https://www.figma.com/design/{FILE_KEY}/Untitled?node-id={node.replace(":", "-")}'

def cell(value):
    return str(value).replace('|', '\\|').replace('\n', ' / ')

MODULES = {
 'onboarding': ('Onboarding & cá nhân hóa', 'GET /bootstrap; PATCH /me/preferences; PUT /me/reminders/daily', 'user_preferences, user_interests, user_goals, reminder_rules', 'Lưu nháp khi chưa đăng nhập; quyền vị trí/thông báo do hệ điều hành cấp; đồng bộ sau đăng nhập.'),
 'auth': ('Tài khoản & xác thực', 'POST /auth/register|login|password-reset/request|password-reset/verify|password-reset/complete; POST /auth/oauth/exchange', 'users, auth_identities, auth_challenges, sessions, consent_records', 'Không tiết lộ email có tồn tại; OTP một lần, có hạn; xác minh provider tại server; không gộp tài khoản chỉ vì email trùng.'),
 'profile': ('Hồ sơ', 'GET/PATCH /me; POST /me/email-change; GET /me/activity', 'users, profiles, media_assets, auth_challenges', 'Email mới cần xác minh; kiểm tra quyền sửa hồ sơ và quyền sở hữu ảnh.'),
 'settings': ('Cài đặt & bảo mật', 'GET/PATCH /me/preferences; GET/DELETE /me/sessions/{id}; POST /me/password', 'user_preferences, sessions, auth_identities, audit_logs', 'Theme là một enum; PIN khóa ứng dụng lưu bảo mật trên thiết bị; không lưu PIN thuần văn bản trên server.'),
 'notifications': ('Thông báo', 'GET /me/notifications; PATCH /me/notifications/{id}; PUT/DELETE /me/push-devices/{id}', 'notifications, notification_deliveries, push_devices, reminder_rules', 'Thông báo thuộc người nhận; kiểm tra quyền đối tượng khi mở deeplink; push không phải nguồn dữ liệu chính.'),
 'community': ('Cộng đồng & tạo bài', 'GET/POST /posts; GET/PATCH/DELETE /posts/{id}; PUT/DELETE /posts/{id}/reaction; GET/POST /posts/{id}/comments; PUT/DELETE /me/saved-posts/{id}', 'posts, post_media, comments, reactions, saved_posts, follows, friendships, user_blocks, moderation_reports', 'Công khai/bạn bè/chỉ mình tôi phải được kiểm tra ở server, cả URL media; bản nháp và gửi lại không tạo bài trùng.'),
 'chat': ('Tin nhắn cá nhân', 'GET/POST /conversations; GET/POST /conversations/{id}/messages; PUT /conversations/{id}/read; WS message.*', 'conversations, conversation_members, messages, message_media, user_blocks', 'Kiểm tra membership trên HTTP và WebSocket; client_message_id chống gửi trùng; cursor hỗ trợ kết nối lại.'),
 'assistant': ('RecycleBot & giọng nói', 'POST /assistant/conversations; POST /assistant/conversations/{id}/messages; POST /assistant/transcriptions', 'assistant_threads, assistant_messages, knowledge_sources, media_assets', 'Nội dung AI là gợi ý; truy xuất nguồn đã duyệt; không tự cộng điểm; microphone có quyền riêng, transcript có thể sửa.'),
 'collection': ('Điểm thu gom', 'GET /collection-points; GET /collection-points/{id}; POST /point-proposals; POST /collection-points/{id}/reports; GET/POST /collection-points/{id}/reviews', 'collection_points, point_materials, point_opening_hours, point_status_observations, point_proposals, point_reports, point_reviews', 'Khoảng cách địa lý khác ETA đường đi; trạng thái có nguồn và thời điểm; đề xuất/báo cáo phải qua duyệt.'),
 'routes': ('Hành trình & bàn giao', 'POST /routes/preview; POST /routes; PATCH /routes/{id}; POST /routes/{id}/stops/{stopId}/handover; GET /routes/{id}/alternatives', 'routes, route_stops, route_stop_materials, handovers, handover_items', 'Đổi điểm không bỏ sót vật liệu; pin cần điểm phù hợp; tự xác nhận là self_reported, chưa phải verified.'),
 'activities': ('Hoạt động & tham gia', 'GET /events; GET /events/{id}; GET /me/calendar; POST /events/{id}/registrations; GET /me/tickets; POST /tickets/{id}/check-in; POST /events/{id}/feedback', 'events, event_roles, event_registrations, event_tickets, attendance_records, event_feedback, event_media, event_impact_metrics', 'Quan tâm/lưu/đăng ký/check-in/hoàn thành là các trạng thái khác nhau; giữ chỗ theo số người trong một transaction.'),
 'favorites': ('Hoạt động đã lưu & nhắc lịch', 'GET/POST /me/event-collections; PUT/DELETE /me/saved-events/{id}; POST /me/event-collections/{id}/move; PUT /me/event-reminders', 'event_collections, saved_events, collection_events, event_reminder_targets, reminder_rules', 'Chuyển bộ sưu tập không hủy đăng ký; không tạo vé khi lưu; nhắc lịch theo timezone và quiet hours.'),
 'news': ('Tin tức', 'GET /articles; GET /articles/{id}; PUT/DELETE /articles/{id}/reaction; GET/POST /articles/{id}/comments; GET /content-metrics', 'articles, article_blocks, article_sources, article_reactions, article_comments, public_metrics', 'Nội dung biên tập có nguồn và phiên bản; số thống kê môi trường là dữ liệu biên tập, không phải tác động cá nhân.'),
 'rewards': ('Điểm, đổi quà & thành tích', 'GET /me/wallet; GET /me/point-transactions; POST /me/daily-claims; GET /rewards; POST /redemptions; GET /me/redemptions; GET /leaderboard', 'wallets, point_ledger, point_rules, daily_claims, rewards, reward_inventory, reward_vouchers, redemptions, redemption_events, level_definitions, badges, user_badges', 'Server tính điểm; sổ cái bất biến; chống trùng theo nguồn; khóa ví và tồn kho; tích lũy lên cấp tách số dư đổi quà.'),
 'handbook': ('Sổ tay & kiến thức rác', 'GET /waste-categories; GET /waste-items; GET /waste-items/{id}; GET /waste-items/{id}/instructions', 'waste_categories, waste_items, waste_materials, waste_instructions, knowledge_sources', 'Nhóm nguy hại độc lập khả năng tái chế; quy tắc theo địa phương/phiên bản; không cố định màu thùng cho mọi nơi.'),
 'scanner': ('Camera & nhận diện', 'POST /media/uploads; POST /scans; GET /scans/{id}; POST /scans/{id}/corrections; POST /sorting-actions', 'media_assets, scans, scan_candidates, scan_corrections, sorting_actions, point_ledger', 'Có nhánh không nhận diện được; confidence không phải độ chắc chắn tuyệt đối; điểm chỉ phát khi đủ điều kiện nghiệp vụ.'),
 'games': ('Trò chơi', 'GET /games; POST /game-sessions; POST /game-sessions/{id}/answers; POST /game-sessions/{id}/finish; GET/POST /game-rooms; POST /game-schedules', 'games, game_questions, game_options, game_sessions, game_answers, game_rooms, game_room_members, game_schedules, game_schedule_invites', 'Server chấm đáp án và phát điểm một lần; Sứ mệnh xanh có luồng, XO/Đua vịt mới là thẻ tính năng cần đặc tả thêm.'),
 'statistics': ('Thống kê', 'GET /me/statistics; GET /statistics/community', 'sorting_actions, handovers, handover_items, point_ledger, daily_user_stats', 'Đếm lượt quét/lượt xác nhận/kg được cân riêng; không suy ra kg từ số ảnh; có kỳ thời gian và mẫu số phần trăm.'),
 'navigation': ('Điều hướng dùng chung', 'GET /bootstrap; điều hướng local', 'Không có bảng riêng cho thanh điều hướng', 'Điều hướng theo đăng nhập/quyền; bảo toàn stack, deeplink và vị trí cuộn.'),
 'support': ('Tư liệu/khung phụ', 'Không tự tạo API từ một lớp phụ', 'Không suy diễn bảng riêng', 'Kiểm tra mục đích trước khi đưa vào backlog sản phẩm; lớp nền, icon, loading và voice frame không phải màn hình nghiệp vụ độc lập.'),
}

def classify(s):
    n, i = s['name'].strip().lower(), s['id']
    if s['type'] != 'FRAME': return 'support'
    if i in {'386:7148','386:7418','386:7154','386:7158','386:7149','386:7151','386:7156','386:7160','386:7168','386:7176'}: return 'onboarding'
    if i in {'386:7184','386:7225','386:7266','386:7307','386:7348','386:7390'}: return 'auth'
    if i in {'386:7420','386:8516'}: return 'profile'
    if 'cài đặt · overlay' in n or n=='cài đặt' or 'thay đổi mật khẩu' in n: return 'settings'
    if 'nhắc lịch' in n or 'bộ sưu tập' in n or 'yêu thích' in n or n=='xóa hoạt động': return 'favorites'
    if 'thông báo' in n or 'thống báo' in n: return 'notifications'
    if n in {'frame 36844','frame 36836','frame 36843','frame 36838','frame 36837','frame 36840','frame 36841','frame 36842','frame 36839','chat2'} or i=='386:8930': return 'assistant'
    if n=='chat' or i=='386:17262': return 'chat'
    if 'cộng đồng' in n or 'đăng bài' in n: return 'community'
    if 'hành trình' in n or 'bàn giao' in n or i in {'386:10136','386:10279','386:10351','386:18627','386:18770','386:18842'}: return 'routes'
    if n=='map' or 'điểm thu gom' in n: return 'collection'
    if 'hoạt động' in n or 'vé tham gia' in n: return 'activities'
    if 'tin tức' in n or n=='sự kiện sắp tới': return 'news'
    if 'trò chơi' in n: return 'games'
    if 'thống kê' in n: return 'statistics'
    if any(x in n for x in ['sotay','sổ tay','racvoco','rachan','rachuuco','ractaiche','allsotay','phân loại rác -']): return 'handbook'
    if 'scan' in n or n in {'ttin rác','tbáo_tích điểm','loading'}: return 'scanner'
    if any(x in n for x in ['tích điểm','quy đổi điểm','phần thưởng','thưởng ngày','điểm mỗi ngày','đổi quà','lịch sử','nhắc tôi','thành tích']): return 'rewards'
    if 'home' in n or n=='navigation': return 'navigation'
    return 'support'

def main():
    data = read('backuped-all.json')
    screens = data['screens']
    assert len(screens)==180 and len({s['id'] for s in screens})==180
    expected = read('backuped-inventory.json')
    assert expected['id']=='386:7053'
    pages=[expected]
    assert {n['id'] for n in expected['children']}=={s['id'] for s in screens}
    counts=Counter(classify(s) for s in screens)
    out=['# Danh mục interface và ánh xạ nghiệp vụ', '', 'Ngày đọc: 29/10/2026. Phạm vi duy nhất: trang backuped, node 386:7053. 169 frame là cả màn hình, biến thể trạng thái, overlay và khung phụ; không tương đương 169 tính năng độc lập.', '', 'Mọi endpoint/bảng trong tài liệu là **đề xuất suy ra từ interface trên trang backuped**, không phải backend đã tồn tại. Bản chụp đầy đủ chữ hiển thị và chữ ẩn: [backuped-all.json](evidence/backuped-all.json).', '', '## Phạm vi trang backuped', '', '| Trang | Node | Đối tượng cấp cao | Phạm vi |','|---|---|---:|---|']
    for p in pages:
        scope='Chỉ interface thuộc trang backuped'
        out.append(f'| {cell(p["name"])} | [{p["id"]}]({link(p["id"])}) | {len(p["children"])} | {scope} |')
    out += ['', '## Các nhóm triển khai', '', '| Nhóm | Số đối tượng cấp cao |','|---|---:|']
    for k,v in counts.items(): out.append(f'| {MODULES[k][0]} | {v} |')
    out += ['', '## Chỉ mục toàn bộ 180 đối tượng', '', '| Node | Tên Figma | Loại | Kích thước | Nhóm | Lớp chữ |','|---|---|---|---|---|---:|']
    for s in screens:
        out.append(f'| [{s["id"]}]({link(s["id"])}) | {cell(s["name"])} | {s["type"]} | {s["w"]:g} × {s["h"]:g} | {MODULES[classify(s)][0]} | {len(s["texts"])} |')
    out += ['', '## Phân rã từng interface', '', 'Các chuỗi dưới đây là trích đoạn quan sát để nhận diện chức năng; bản JSON lưu toàn bộ nội dung, kể cả đoạn bài viết dài. Thành phần liệt kê từ cây Figma ở độ sâu 0–2; instance chỉ là phần tái sử dụng, không đại diện cho toàn bộ UI.', '']
    manifest=[]
    for s in screens:
        module=classify(s); title,api,tables,rule=MODULES[module]
        visible=[t for t in s['texts'] if isinstance(t,str) and t.strip()]
        hidden=[t['hidden'] for t in s['texts'] if isinstance(t,dict) and t.get('hidden','').strip()]
        out += [f'### {s["id"]} — {s["name"].strip()}', '', f'[Mở Figma]({link(s["id"])}) · {s["type"]} · {s["w"]:g} × {s["h"]:g} · Nhóm: {title}.', '']
        parts=[p[1] for p in s['parts'][1:]]
        out.append('**Cấu trúc quan sát:** '+('; '.join(dict.fromkeys(parts)) if parts else 'Khung phụ/đồ họa; không có container con trong phạm vi trích xuất.')+'.')
        out.append('')
        out.append('**Nội dung/điều khiển nhận diện:** '+(' · '.join(cell(t[:180]+('…' if len(t)>180 else '')) for t in visible[:16]) if visible else 'Không có lớp chữ hiển thị; cần xem đồ họa trong Figma.')+'.')
        if hidden: out += ['', '**Trạng thái ẩn có sẵn:** '+ ' · '.join(cell(t[:180]) for t in hidden)+'.']
        inst=s['instanceCounts']
        if inst: out += ['', '**Instance đang dùng:** '+ '; '.join(f'{cell(k)} ×{v}' for k,v in inst.items())+'.']
        out += ['', f'**Contract đề xuất:** `{api}`.', '', f'**Dữ liệu đề xuất:** `{tables}`.', '', f'**Điều kiện triển khai:** {rule}', '']
        manifest.append({'id':s['id'],'name':s['name'],'type':s['type'],'module':module,'textCount':len(s['texts']),'hiddenTextCount':len(hidden),'hasApiMapping':True,'hasDatabaseMapping':True,'source':link(s['id'])})
    (ROOT/'01-interface-catalog.md').write_text('\n'.join(out),encoding='utf-8')
    comp=read('components.json')
    rows=['# Component tham chiếu thực tế', '', f'{comp["instanceCount"]} instance, {len(comp["components"])} main component khác nhau, {comp["unresolved"]} tham chiếu không phân giải được. remote là cờ Figma, không phải khẳng định quyền sửa/publish thư viện.', '', '| Component ID | Tên | Component set/cha | remote | Số instance |','|---|---|---|---|---:|']
    for c in sorted(comp['components'],key=lambda c:-c['count']):
        rows.append(f'| {c["id"]} | {cell(c["name"])} | {cell((c.get("parent") or {}).get("name", "—"))} | {c["remote"]} | {c["count"]} |')
    (ROOT/'02a-figma-component-inventory.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
    report={'capturedOn':'2026-10-29','pageCount':len(pages),'topLevelObjectCount':sum(len(p['children']) for p in pages),'primaryObjectCount':len(screens),'primaryFrameCount':sum(s['type']=='FRAME' for s in screens),'primaryTextCount':sum(len(s['texts']) for s in screens),'primaryInstanceCount':comp['instanceCount'],'uniqueMainComponentCount':len(comp['components']),'moduleCounts':dict(counts),'screens':manifest}
    (ROOT/'coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='screens'},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
