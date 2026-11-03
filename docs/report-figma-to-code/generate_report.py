"""Generate the Vietnamese BlueSteps Figma-to-code report from repository evidence."""
from pathlib import Path
import hashlib
import html
import json
import re

from PIL import Image as PILImage
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/BlueSteps_Huong_dan_Figma_sang_Code.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
for name, filename in [('Arial', 'arial.ttf'), ('ArialB', 'arialbd.ttf'), ('ArialI', 'ariali.ttf'), ('Mono', 'consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(Path('C:/Windows/Fonts') / filename)))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='ArialB', italic='ArialI', boldItalic='ArialB')
W, H = 595.276, 841.89
M = 43
CW = W - 2*M
BLUE = '#147CC1'
INK = '#164561'
MUTED = '#456476'
LIGHT = '#EDF7FC'
c = canvas.Canvas(str(OUT), pagesize=(W, H))
c.setTitle('BlueSteps - Hướng dẫn sinh code từ Figma sang React Native')
c.setAuthor('BlueSteps Project')
c.setSubject('Quy trình, hướng dẫn thực hành và minh chứng từ project; 03/11/2026')
page = 0
y = 0
checks = []

def para(text, size=10.4, leading=15.4, color=INK, font='Arial', space=8, x=None, width=None):
    global y
    x = M if x is None else x
    width = CW if width is None else width
    style = ParagraphStyle('body', fontName=font, fontSize=size, leading=leading, textColor=colors.HexColor(color))
    p = Paragraph(text, style)
    _, height = p.wrap(width, 1000)
    p.drawOn(c, x, y-height)
    y -= height + space
    checks.append((page, y, 'paragraph'))
    return height

def heading(text):
    para(text, 13, 17, BLUE, 'ArialB', 8)

def source(text):
    para(text, 8, 11.4, MUTED, space=7)

def note(title, text):
    global y
    p = Paragraph(f'<b>{title}</b><br/>{text}', ParagraphStyle('note', fontName='Arial', fontSize=10, leading=14.4, textColor=colors.HexColor(INK)))
    _, ph = p.wrap(CW-26, 1000)
    c.setFillColor(colors.HexColor(LIGHT))
    c.roundRect(M, y-ph-24, CW, ph+24, 9, fill=1, stroke=0)
    p.drawOn(c, M+13, y-ph-12)
    y -= ph+36
    checks.append((page, y, 'note'))

def code(text, size=8.3, label=None):
    global y
    if label:
        para(label, 9.2, 13, BLUE, 'ArialB', 5)
    lines = text.strip('\n').splitlines()
    line_h = size*1.43
    box_h = len(lines)*line_h + 23
    c.setFillColor(colors.HexColor('#102D40'))
    c.roundRect(M, y-box_h, CW, box_h, 8, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#E7F5FF'))
    c.setFont('Mono', size)
    for i, line in enumerate(lines):
        if pdfmetrics.stringWidth(line, 'Mono', size) > CW-26:
            raise ValueError(f'Code line too wide on page {page}: {line}')
        c.drawString(M+13, y-17-i*line_h, line)
    y -= box_h+12
    checks.append((page, y, 'code'))

def table(rows, widths, size=9.3):
    global y
    st = ParagraphStyle('cell', fontName='Arial', fontSize=size, leading=size*1.4, textColor=colors.HexColor(INK))
    cells = [[Paragraph(str(cell), st) for cell in row] for row in rows]
    t = Table(cells, colWidths=widths, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#DCEEF9')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F5FAFD')]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 9), ('RIGHTPADDING', (0,0), (-1,-1), 9),
        ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,0), 0.7, colors.HexColor('#A7CCE3')),
    ]))
    _, th = t.wrap(CW, 1000)
    t.drawOn(c, M, y-th)
    y -= th+13
    checks.append((page, y, 'table'))

def start(kicker, title, intro=None):
    global y, page
    if page:
        c.showPage()
    page += 1
    c.setFillColor(colors.HexColor(BLUE))
    c.rect(0, H-9, W, 9, fill=1, stroke=0)
    c.setFont('ArialB', 9)
    c.drawString(M, H-35, 'BLUESTEPS  /  FIGMA TO CODE')
    c.setFillColor(colors.HexColor(MUTED))
    c.setFont('Arial', 8)
    c.drawRightString(W-M, H-35, 'TÀI LIỆU PROJECT · 03/11/2026')
    c.setStrokeColor(colors.HexColor('#D2E7F4'))
    c.line(M, 42, W-M, 42)
    c.setFont('Arial', 8)
    c.drawString(M, 28, 'Thiết kế → component → dữ liệu → kiểm chứng')
    c.drawRightString(W-M, 28, f'{page:02d} / 10')
    y = H-67
    para(kicker.upper(), 9, 12, BLUE, 'ArialB', 8)
    para(title, 25, 30, INK, 'ArialB', 12)
    if intro:
        para(intro, 10.5, 15.5, MUTED, space=16)

def pair(left, right, labels):
    global y
    top = y
    image_w = 186
    image_h = 403
    xs = [M+24, W-M-24-image_w]
    for path, label, x in zip([left, right], labels, xs):
        c.setFillColor(colors.HexColor(BLUE))
        c.setFont('ArialB', 9)
        c.drawString(x, top-9, label)
        c.drawImage(str(ROOT/path), x, top-24-image_h, width=image_w, height=image_h, preserveAspectRatio=True, anchor='n', mask='auto')
    y = top-24-image_h-13
    checks.append((page, y, 'images'))

def exact_excerpt(path, first, last):
    return '\n'.join((ROOT/path).read_text(encoding='utf-8').splitlines()[first-1:last])

start('Báo cáo & hướng dẫn thực hành', 'Sinh code từ Figma\nsang ứng dụng BlueSteps'.replace('\n', '<br/>'),
      'Áp dụng cho Expo / React Native / TypeScript. Có ảnh đối chiếu, mã nguồn thực tế, mẫu yêu cầu sinh code và hướng dẫn tái lập.')
note('Mục tiêu tài liệu', 'Trình bày cách biến frame thiết kế thành giao diện có thể bảo trì trong project BlueSteps: phân tích layout, lấy asset, tạo component, nối điều hướng và dữ liệu, rồi đối chiếu kết quả.')
heading('Bối cảnh của project')
para('BlueSteps hỗ trợ phân loại rác và các hoạt động sống xanh. Frontend nằm trong <b>apps/mobile</b>; API sử dụng Python/FastAPI; dữ liệu lưu ở PostgreSQL/PostGIS. Báo cáo tập trung vào phần chuyển thiết kế sang frontend, dùng Trang chủ và Sổ tay rác làm ví dụ. [S1, S5, S6]')
table([
    ['Đầu vào thiết kế', 'Đầu ra trong project'],
    ['File Figma: 7GCLABwia0mauoszRi0Vtt<br/>Trang backuped · node 386:7053', 'Screen React Native, component dùng chung,<br/>token màu/chữ và asset cục bộ'],
    ['211 frame theo kiểm kê đã lưu;<br/>gồm màn, overlay và biến thể', 'Route trong apps/mobile/app;<br/>logic màn trong src/features/live'],
], [CW/2, CW/2])
heading('Nội dung tra cứu nhanh')
table([
    ['Trang', 'Nội dung'],
    ['02-03', 'Chọn cách sinh code và lấy thông số từ Figma'],
    ['04-05', 'Ánh xạ component/token và mẫu yêu cầu cho AI'],
    ['06-07', 'Minh chứng hình ảnh Trang chủ và Sổ tay rác'],
    ['08-09', 'Nối route/API, chạy project và đọc kết quả kiểm chứng'],
    ['10', 'Danh mục nguồn, giới hạn và gợi ý trình bày báo cáo'],
], [62, CW-62])
source('Phạm vi bằng chứng: đọc mã nguồn và hồ sơ có sẵn trong workspace ngày 03/11/2026. Không chạy lại app/test, không đọc lại file Figma trực tiếp trong lượt lập PDF này.')

start('01 / Chuẩn bị', 'Chọn luồng sinh code', 'Thiết kế cung cấp cấu trúc và thông số; lập trình viên hoặc AI chuyển chúng sang đúng nền tảng của project.')
table([
    ['Cách làm', 'Thao tác', 'Vai trò với BlueSteps'],
    ['Dev Mode / Inspect', 'Chọn frame/layer, đọc màu, font, khoảng cách và xuất asset. [W1]', 'Phù hợp để đo và đối chiếu từng phần. Snippet cần chuyển sang React Native.'],
    ['Figma MCP + AI', 'Đưa link node cho công cụ AI có kết nối Figma; lấy context, ảnh và asset. [W2]', 'Có context đã lưu trong docs; dùng để yêu cầu AI viết lại theo cấu trúc repo.'],
    ['Code Connect', 'Ánh xạ component thiết kế với component đang dùng trong code. [W3]', 'Lựa chọn mở rộng khi chuẩn hóa thư viện; tài liệu này không xác nhận project đã cài đặt.'],
], [100, 195, CW-295], 9.3)
heading('Chuẩn bị trước khi bắt đầu')
para('<b>1. Xác định đúng frame.</b> <link href="https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7053" color="#147CC1">Mở file thiết kế</link>, chọn trang <b>backuped</b>, chọn frame cần làm và sao chép link có node-id. Ví dụ Home: <b>391:25197</b>; Sổ tay: <b>386:13263</b>. [S2, S3]')
para('<b>2. Đọc cấu trúc ứng dụng.</b> Xem package.json, màn gần giống, design-system và token hiện có. BlueSteps đã dùng Expo Router; giữ chuẩn route và TypeScript của repo. [S1, S4-S7]')
para('<b>3. Chuẩn bị dữ liệu bàn giao.</b> Lưu ảnh frame, kích thước, bảng màu, typography, trạng thái và các asset riêng. Với font, cần đủ family/weight/size/line-height; với ảnh, cần phân biệt trang trí và nội dung API.')
para('<b>4. Kiểm tra khả năng đọc thiết kế.</b> Nếu kết nối không đọc được file, dùng bản xuất/context đã lưu và ghi rõ thời điểm. Không tự kết luận bản lưu là thiết kế mới nhất.')
note('Lựa chọn dùng trong báo cáo', 'Diễn giải luồng Figma context → AI hỗ trợ sinh code → chuyển thành React Native → tích hợp vào repo. Minh chứng được lấy từ context, ảnh và source đã có; không mô tả một phiên sinh code mới vừa được thực hiện.')
source('Tài liệu chính thức: [W1] Figma Dev Mode; [W2] Figma MCP; [W3] Code Connect. Link đầy đủ ở trang 10.')

start('02 / Lấy thông số', 'Từ frame đến đặc tả UI', 'Ví dụ cụ thể: Home 391:25197, khung thiết kế 428 × 926. [S2]')
heading('Các thông số cần ghi lại')
table([
    ['Nhóm', 'Minh chứng đã lưu', 'Cách chuyển sang code'],
    ['Kích thước', 'width 428; height 926', 'Dùng làm viewport đối chiếu; bổ sung bố cục thích ứng cho màn hẹp.'],
    ['Nền trang', 'RGB ≈ (0.9569, 0.9843, 1)', 'Quy đổi thành #F4FBFF; đã có token background.'],
    ['Lời chào', 'Montserrat Bold 21', 'Label size={21}, bold; kiểm tra font đã được load.'],
    ['Hero và nút', 'Montserrat Bold 24;<br/>SemiBold 15', 'Tách vùng hero, artwork và Pressable; thêm onPress cho nút.'],
    ['Component / asset', 'Context có data-node-id,<br/>hằng URL ảnh và SVG', 'Giữ nguồn gốc layer; tải asset về repo và dùng import/require cục bộ.'],
], [88, 170, CW-258])
heading('Thực hiện trong Figma')
para('<b>Bước 1.</b> Chọn frame, chụp toàn màn ở kích thước gốc; ghi node ID vào tên ảnh hoặc bảng mapping.<br/><b>Bước 2.</b> Chọn từng vùng: header, hero, lối tắt, ví và navigation; đọc padding, gap, radius, alignment và kiểu chữ.<br/><b>Bước 3.</b> Xuất từng icon/minh họa SVG hoặc PNG; ghi tên, kích thước và màn sử dụng.<br/><b>Bước 4.</b> Đọc prototype để biết nút mở route, modal hay đổi state. Một frame có thể là một state của cùng screen.')
code('Frame / Auto Layout   -> View + flexDirection + gap\nText layer            -> Label / Text\nButton / interaction  -> Pressable + onPress\nImage / vector        -> Artwork / Image + local asset\nVariant / overlay     -> props, URL params, state hoặc modal', label='Bảng chuyển đổi khái niệm (hướng dẫn)')
note('Lưu ý khi dùng code sinh sẵn', 'Context có thể xuất React web và class Tailwind. Cần thay thẻ HTML bằng component native, chuyển style sang object/StyleSheet và kiểm tra font. Flexbox React Native có một số mặc định khác web. [W4, W5]')
source('[S2] figma-selected-properties.json; [S3] contexts/391-25197.txt; [S4] design-tokens; [S5] HomeScreen.tsx. Các đường dẫn đầy đủ ở trang 10.')

start('03 / Chuẩn hóa', 'Tạo token và component', 'Tái sử dụng lớp giao diện có sẵn giúp code sinh ra phù hợp với project và giảm trùng lặp.')
heading('1. Dùng bảng màu và khoảng cách của repo')
code("background: '#F4FBFF',\nsurface: '#FFFFFF',\nbrand: '#147CC1',\ntext: '#164561',\n\nexport const spacing = {\n  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32\n};\nexport const radius = { sm: 12, md: 18, lg: 26, pill: 99 };", label='Trích rút từ packages/design-tokens/src/index.ts [S4]')
para('Các giá trị trên được chép từ source; đoạn trích đã bỏ phần object bao ngoài và <b>as const</b> để dễ đọc. Khi triển khai, dùng token qua theme của ứng dụng. Project có cả bảng màu light/dark; tránh chỉ đổi màu chữ mà giữ nền cố định.')
heading('2. Ánh xạ thiết kế sang thư viện UI')
table([
    ['Phần thiết kế', 'Component/source hiện có', 'Trách nhiệm'],
    ['Khung màn hình', 'DesignScreen', 'Header, vùng cuộn, nền và safe area.'],
    ['Nội dung chữ', 'Label + Typography', 'Font family, weight, size và màu.'],
    ['Icon/minh họa', 'Artwork + app-assets', 'Render asset riêng; hỗ trợ contentFit.'],
    ['Thao tác', 'Button / DesignIconButton', 'Nhãn, trạng thái tương tác và handler.'],
], [110, 170, CW-280])
heading('3. Đặt file đúng vị trí')
code('apps/mobile/app/               # route Expo Router\napps/mobile/src/features/live/ # màn và logic UI\napps/mobile/src/design-system/ # component, asset mapping\napps/mobile/assets/figma/      # ảnh và SVG từ Figma\npackages/design-tokens/src/    # màu, spacing, radius', size=8.7)
source('[S4-S7] Source trong workspace. Không cài thêm Tailwind chỉ vì đoạn code đầu vào dùng className; chuyển về hệ style mà project đang dùng.')

start('04 / Sinh mã', 'Mẫu yêu cầu AI cho project', 'Mẫu dưới đây là hướng dẫn đề xuất có thể sao chép, không phải nhật ký prompt lịch sử của project.')
heading('Lượt 1: yêu cầu đọc và phân tích trước')
note('Mẫu prompt 1', 'Hãy phân tích frame Home node 391:25197 trong file Figma 7GCLABwia0mauoszRi0Vtt, trang backuped. Đích là apps/mobile của BlueSteps, dùng Expo/React Native/TypeScript. Đọc HomeScreen.tsx, DesignScreen.tsx, ui.tsx, app-assets.ts và design-tokens trước. Liệt kê vùng UI, asset, font, route và component có thể tái sử dụng. Nếu không đọc được Figma, dùng context/ảnh đã lưu và nêu giới hạn; không tự đoán thông số chưa có.')
heading('Lượt 2: yêu cầu tạo hoặc chỉnh code')
note('Mẫu prompt 2', 'Triển khai frame Home bằng component native và style của repo. Dùng DesignScreen, Label, Artwork và token có sẵn. Tách header/hero/shortcut/wallet; dùng asset riêng trong assets/figma. Tên tài khoản và điểm lấy từ provider/API, không chép tên hay 180 điểm của Figma. Nút Quét rác ngay mở /scan. Hỗ trợ màn hẹp và chữ lớn; thêm nhãn accessibility. Liệt kê file thay đổi, ảnh cần đối chiếu và phần chưa có bằng chứng. Không tự mở các tính năng ngoài phạm vi.')
heading('Thứ tự thực hành sau khi AI trả code')
para('<b>1.</b> Kiểm tra import và kiểu props; loại thẻ div/span, CSS không hỗ trợ native và URL asset tạm.<br/><b>2.</b> Ghép từng section vào screen hiện có; giữ provider, hooks và hành vi đang hoạt động.<br/><b>3.</b> Nối onPress với Expo Router, bổ sung loading/error/empty theo query thật.<br/><b>4.</b> Mở đúng route, chụp cùng viewport với Figma; sửa font, khoảng cách, ảnh và safe area.<br/><b>5.</b> Ghi lại trạng thái đã kiểm và phần chưa kiểm; chỉ chạy các kiểm tra phù hợp với phạm vi được giao.')
code("// Route Home hiện có [S7]\nexport { HomeScreen as default }\n  from '../../src/features/live/HomeScreen';", label='Ví dụ đầu ra tích hợp vào route của project')
para('Kết quả mong đợi là mã nguồn có thể đọc, sửa và tái sử dụng. Một ảnh giống mẫu chỉ chứng minh hình thức của trạng thái đã chụp; luồng dữ liệu và tương tác cần được đánh giá riêng.', size=10.4)

start('05 / Minh chứng hình ảnh', 'Trang chủ: thiết kế và app', 'Hai ảnh cùng khung 428 × 926. Bên trái là Figma đã lưu; bên phải là runtime từ đợt kiểm Sổ tay ngày 02/11/2026. [E1, E2]')
pair('docs/ui-recheck-2026-11-01/figma-home.png', 'docs/figma-completion/handbook-full-runtime/home-428.png', ['A · FIGMA / HOME', 'B · APP / HOME'])
source('Hình 1. Nguồn E1: ui-recheck-2026-11-01/figma-home.png. E2: handbook-full-runtime/home-428.png; dữ liệu API/PostgreSQL local biệt lập theo checks.json, không phải ảnh mới chụp cho PDF.')
heading('Chi tiết có thể kiểm tra trực tiếp')
para('<b>Bố cục giữ lại:</b> lời chào, nút thông báo, hero xanh, minh họa trái đất, bốn lối tắt, ví điểm và thanh điều hướng. Source HomeScreen dùng DesignScreen, Artwork và danh sách shortcuts. [S5]')
para('<b>Khác biệt nhìn thấy:</b> tên dài trong ảnh app xuống hai dòng, đẩy hero xuống; điểm ví là 42 thay vì 180; phần dưới phụ thuộc nội dung thật. Đây là ví dụ cần kiểm bố cục với dữ liệu dài, đồng thời không chép dữ liệu mẫu làm dữ liệu tài khoản.')
source('Ảnh so sánh minh họa kết quả chuyển thiết kế; không phải phép đo pixel-diff hoặc xác nhận toàn bộ Home đã được nghiệm thu.')

start('06 / Minh chứng hình ảnh', 'Sổ tay: từ thẻ đến điều hướng', 'Frame Figma 386:13263 và giao diện chạy 428 × 926, dùng các asset riêng thay cho ảnh chụp toàn màn. [E3, E4, S6]')
pair('docs/figma-fidelity/reference/386-13263.png', 'docs/figma-completion/handbook-full-runtime/handbook-428.png', ['A · FIGMA / SỔ TAY', 'B · APP / SỔ TAY'])
source('Hình 2. E3: figma-fidelity/reference/386-13263.png. E4: handbook-full-runtime/handbook-428.png, đợt kiểm ngày 02/11/2026. Ảnh cho thấy header, ô tìm kiếm, ba nhóm rác và navigation; khoảng cách dọc vẫn khác.')
code("router.push({\n  pathname: '/handbook/category/[category]',\n  params: { category: item.code }\n})", size=8.2, label='Trích rút lệnh trong onPress của CategoryTile [S6]')
para('Thẻ dùng code nhóm <b>recycle / organic / inorganic</b>, ảnh và màu riêng; nhấn thẻ mở route nhóm. Pressable có accessibilityRole="button" và nhãn bằng item.title. Đoạn trích chỉ giữ lệnh điều hướng.', size=9.5, leading=13.5)

start('07 / Tích hợp', 'Nối route, trạng thái và API', 'Sau khi có bố cục, thay nội dung minh họa bằng dữ liệu thật và bảo toàn các quyết định nghiệp vụ của project.')
heading('1. Nối dữ liệu theo cách Home đang dùng')
code("const { user, status, colors } = useApp();\nconst wallet = useResource<Schemas['Wallet']>(\n  '/v1/me/wallet', true\n);\nconst events = usePages<Schemas['GreenEvent']>('/v1/events');\nconst articles = usePages<Schemas['Article']>('/v1/articles');", label='Trích rút từ HomeScreen.tsx; các dòng không liên tiếp [S5]')
para('Tên hiển thị lấy từ hồ sơ/provider; ví lấy từ endpoint cá nhân. Ảnh trang trí dùng asset của thiết kế; ảnh bài viết, địa điểm hoặc avatar phải theo nguồn nội dung đang áp dụng trong project. Không gán tên, điểm, vé hoặc thành tích trong Figma cho người dùng.')
heading('2. Dựng đủ trạng thái của cùng một màn')
table([
    ['Trạng thái', 'Hành vi cần thiết kế và kiểm tra'],
    ['Đang tải', 'Cho biết đang lấy dữ liệu; tránh hiển thị kết quả mẫu như dữ liệu thật.'],
    ['Có dữ liệu / dữ liệu dài', 'Render nội dung, xuống dòng hợp lý; nút và vùng cuộn vẫn dùng được.'],
    ['Rỗng / lỗi / chưa đăng nhập', 'Có thông báo tương ứng, thử lại hoặc điều hướng đăng nhập nếu cần.'],
    ['Modal / bộ lọc', 'Có đóng/quay lại; lưu state vào URL nếu cần tái lập sau reload.'],
], [150, CW-150])
heading('3. Giữ những thay đổi đã được project chốt')
para('Hồ sơ hoàn thiện hiện hành ghi rõ: onboarding trước đăng nhập; ảnh chụp/chọn trả kết quả Chai nhựa; không triển khai Google/Facebook; ghi âm chỉ giữ hiện diện giao diện. Khi sinh code từ prototype cũ cần tôn trọng các quyết định này. [S10]')
note('Ví dụ state có thể tái lập', 'Ở Sổ tay, URL giữ query tìm kiếm; một số trang nhóm dùng expanded=1 để mở rộng và giữ trạng thái sau reload. Một frame không nhất thiết cần một route độc lập; có thể được biểu diễn bằng tham số hoặc state. [S6, S8]')

start('08 / Chạy và đối chiếu', 'Tái lập và đọc minh chứng', 'Các lệnh dưới đây là hướng dẫn cho lần thực hành tiếp theo. Báo cáo này không chạy lại bộ kiểm thử sản phẩm.')
heading('Bước 1. Cài và chạy theo README của project')
code('cd D:\\BlueSteps\npnpm install --frozen-lockfile\n# Cần backend/database được cấu hình theo README trước\npnpm dev:connected', label='Môi trường yêu cầu: Node 22.14+, pnpm 11.25.0, Python 3.12 [S1]')
para('Lệnh dev:connected mở web phát triển ở localhost:8081 và phối hợp API/worker. Với điện thoại, README hướng dẫn <b>pnpm go:connected</b> và cấu hình LAN. Các bí mật kết nối chỉ đặt ở backend; frontend dùng EXPO_PUBLIC_API_URL. [S1]')
heading('Bước 2. Đối chiếu bố cục ở cùng điều kiện')
para('Mở Home hoặc /handbook, chụp ở 428 × 926 và 390 × 844. So thứ tự section, font/weight, padding/gap, radius, tỷ lệ asset, wrap chữ, vùng cuộn và thanh điều hướng. Trên native, kiểm safe area và chữ lớn; thanh hệ thống phải theo thiết bị thật.')
heading('Bước 3. Kiểm code và hành vi khi cần')
code('pnpm typecheck\npnpm lint\npnpm test\npnpm build\npnpm bundle:native', label='Các lệnh đã khai báo ở package.json; chọn theo phạm vi [S1]')
heading('Minh chứng kiểm thử đã tồn tại trong repo')
code('handbook-unit.log:\n  Test Suites: 1 passed, 1 total\n  Tests:       9 passed, 9 total\n\nhandbook-browser-full.log:\n  19 passed (9.6m)\n  1 passed, 1 warning in 616.02s (0:10:16)', size=8.2, label='Trích log của đợt Sổ tay 02/11/2026 [E6, E7]')
para('checks.json lưu <b>66 lượt bố cục</b> trong đợt này. Kết quả ghi nhận kiểm thử của thời điểm đó; source có thể đã thay đổi sau đó. Typecheck/build đạt không chứng minh mọi frame khớp pixel; export iOS không thay nghiệm thu trên iPhone. [E5, S8, S10]', size=9.7, leading=14)

start('09 / Nguồn & phạm vi', 'Tra cứu bằng chứng', 'Mọi đường dẫn bên dưới tính từ thư mục gốc D:\\BlueSteps. Ảnh và code là bằng chứng từ project; prompt và bảng chuyển đổi là hướng dẫn đề xuất.')
table([
    ['Mã', 'Nguồn trong repository / mục đích'],
    ['S1', 'README.md; package.json; apps/mobile/package.json<br/>Cấu trúc stack, điều kiện chạy và lệnh đã khai báo.'],
    ['S2-S3', 'docs/ui-audit-2026-11-01/figma-selected-properties.json<br/>docs/figma-fidelity/contexts/391-25197.txt<br/>Thông số Home và context Figma đã lưu.'],
    ['S4-S5', 'packages/design-tokens/src/index.ts<br/>apps/mobile/src/features/live/HomeScreen.tsx<br/>Token thực tế, bố cục và query Trang chủ.'],
    ['S6-S7', 'apps/mobile/src/features/live/HandbookScreens.tsx<br/>apps/mobile/src/design-system/{DesignScreen.tsx, ui.tsx, app-assets.ts}<br/>apps/mobile/app/(tabs)/index.tsx<br/>Màn Sổ tay, component dùng chung và route Home.'],
    ['S8-S10', 'docs/figma-completion/handbook-verification.md<br/>docs/handbook-fixes-2026-11-03.md (S9)<br/>docs/figma-completion/README.md (S10)<br/>Phạm vi kiểm chứng, sửa theme và các quyết định hiện hành.'],
    ['E1-E4', 'Ảnh Figma/runtime: đường dẫn ngay dưới Hình 1 và Hình 2.<br/>E1 từ recheck 01/11; E2, E4 từ đợt Sổ tay 02/11; E3 là bản tham chiếu Figma lưu trong repo.'],
    ['E5-E7', 'docs/figma-completion/handbook-full-runtime/checks.json (E5)<br/>docs/figma-completion/handbook-unit.log (E6)<br/>docs/figma-completion/handbook-browser-full.log (E7)'],
], [49, CW-49], 8.3)
heading('Tài liệu kỹ thuật chính thức (tra cứu 03/11/2026)')
for label, url in [
    ('W1 · Figma Dev Mode', 'https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode-in-Figma'),
    ('W2 · Figma MCP', 'https://developers.figma.com/docs/figma-mcp-server/'),
    ('W3 · Code Connect', 'https://developers.figma.com/docs/code-connect/'),
    ('W4 · React Native Flexbox', 'https://reactnative.dev/docs/flexbox'),
    ('W5 · React Native Style', 'https://reactnative.dev/docs/style'),
]:
    para(f'<link href="{url}" color="{BLUE}">{label} - nhấn để mở tài liệu</link>', 9, 12, space=4)
para('<b>Giới hạn:</b> không có phiên sinh code mới hay nghiệm thu toàn bộ Figma trong lượt lập báo cáo. Ảnh/log là bằng chứng lịch sử có nguồn; thay đổi gần đây cần kiểm riêng. Khi thuyết trình, có thể trình bày theo chuỗi: frame → thông số → component → route/API → ảnh và log.', 9.4, 13.4, space=0)

assert page == 10
bad = [(p, round(v, 1), typ) for p, v, typ in checks if v < 51]
if bad:
    raise RuntimeError(f'Content extends into footer: {bad}')
c.save()
evidence_files = [
    'docs/ui-recheck-2026-11-01/figma-home.png',
    'docs/figma-completion/handbook-full-runtime/home-428.png',
    'docs/figma-fidelity/reference/386-13263.png',
    'docs/figma-completion/handbook-full-runtime/handbook-428.png',
    'apps/mobile/src/features/live/HomeScreen.tsx',
    'apps/mobile/src/features/live/HandbookScreens.tsx',
    'packages/design-tokens/src/index.ts',
    'docs/figma-completion/handbook-unit.log',
    'docs/figma-completion/handbook-browser-full.log',
]
manifest = {'report': str(OUT), 'pages': page, 'date': '2026-11-03', 'evidence': []}
for rel in evidence_files:
    path = ROOT/rel
    entry = {'path': rel, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    if path.suffix == '.png':
        entry['image_size'] = list(PILImage.open(path).size)
    manifest['evidence'].append(entry)
(Path(__file__).parent/'evidence-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'output': str(OUT), 'pages': page, 'min_content_y': min(t[1] for t in checks)}, ensure_ascii=False))
