export type Material = 'Nhựa' | 'Giấy' | 'Kim loại' | 'Thủy tinh' | 'Pin' | 'Hữu cơ';
export type WasteItem = {
  id: string;
  name: string;
  material: Material;
  category: string;
  icon: string;
  hazardous?: boolean;
  steps: string[];
};
const baseWasteItems: WasteItem[] = [
  {
    id: 'bottle',
    name: 'Chai nhựa PET',
    material: 'Nhựa',
    category: 'Tái chế',
    icon: 'water-outline',
    steps: [
      'Đổ hết chất lỏng và làm sạch chai.',
      'Để khô, ép gọn nếu điểm thu gom yêu cầu.',
      'Kiểm tra loại nhựa điểm thu gom tiếp nhận.',
    ],
  },
  {
    id: 'paper',
    name: 'Giấy & hộp carton',
    material: 'Giấy',
    category: 'Tái chế',
    icon: 'document-outline',
    steps: [
      'Tách băng dính và vật liệu khác.',
      'Giữ giấy sạch, khô; gấp phẳng hộp.',
      'Giấy dính dầu mỡ cần hỏi đơn vị thu gom riêng.',
    ],
  },
  {
    id: 'can',
    name: 'Lon nhôm',
    material: 'Kim loại',
    category: 'Tái chế',
    icon: 'cafe-outline',
    steps: [
      'Đổ hết đồ uống, tráng sạch.',
      'Để khô và gom riêng.',
      'Cẩn thận các cạnh sắc khi thu gom.',
    ],
  },
  {
    id: 'glass',
    name: 'Chai thủy tinh',
    material: 'Thủy tinh',
    category: 'Tái chế',
    icon: 'flask-outline',
    steps: [
      'Tháo nắp, tráng sạch.',
      'Bọc kỹ mảnh vỡ và ghi nhãn cảnh báo.',
      'Xác nhận điểm có tiếp nhận thủy tinh.',
    ],
  },
  {
    id: 'battery',
    name: 'Pin đã qua sử dụng',
    material: 'Pin',
    category: 'Thu gom riêng',
    icon: 'battery-half-outline',
    hazardous: true,
    steps: [
      'Không bỏ chung với rác sinh hoạt.',
      'Giữ khô, tránh nhiệt và không tháo mở pin.',
      'Liên hệ đơn vị thu gom chuyên biệt để được hướng dẫn.',
    ],
  },
  {
    id: 'organic',
    name: 'Vỏ rau củ',
    material: 'Hữu cơ',
    category: 'Hữu cơ',
    icon: 'leaf-outline',
    steps: [
      'Tách túi nilon và các vật liệu khác.',
      'Gom vào dụng cụ có nắp đậy.',
      'Hỏi hướng dẫn xử lý hữu cơ tại địa phương.',
    ],
  },
];
export type CollectionPoint = {
  id: string;
  name: string;
  address: string;
  area: string;
  materials: Material[];
  distance: string;
  hours: string;
  open: boolean;
  capacity: string;
};
const baseCollectionPoints: CollectionPoint[] = [
  {
    id: 'green-hub',
    name: 'Trạm xanh An Hải',
    address: '12 đường An Hải, Đà Nẵng',
    area: 'Sơn Trà',
    materials: ['Nhựa', 'Giấy', 'Kim loại'],
    distance: '1,2 km',
    hours: '08:00 – 17:00',
    open: true,
    capacity: 'Cần xác nhận trước khi đến',
  },
  {
    id: 'paper-house',
    name: 'Ngôi nhà giấy',
    address: '28 đường Hải Châu, Đà Nẵng',
    area: 'Hải Châu',
    materials: ['Giấy', 'Nhựa'],
    distance: '2,4 km',
    hours: '07:30 – 18:00',
    open: true,
    capacity: 'Chưa có dữ liệu trực tiếp',
  },
  {
    id: 'battery-box',
    name: 'Hộp pin an toàn',
    address: '56 đường Thanh Khê, Đà Nẵng',
    area: 'Thanh Khê',
    materials: ['Pin'],
    distance: '3,1 km',
    hours: '09:00 – 16:00',
    open: false,
    capacity: 'Liên hệ đơn vị tiếp nhận',
  },
];
export type GreenEvent = {
  id: string;
  title: string;
  day: string;
  month: string;
  time: string;
  area: string;
  description: string;
  icon: string;
  category: string;
};
const baseEvents: GreenEvent[] = [
  {
    id: 'beach',
    title: 'Một sáng sạch hơn cho biển',
    day: '01',
    month: 'TH11',
    time: '07:00 – 09:00 · 01/11/2026',
    area: 'Bãi biển Mỹ Khê',
    description:
      'Cùng nhau nhặt rác ven biển và tìm hiểu cách phân loại. Mang theo bình nước cá nhân, mũ và trang phục phù hợp. Đây là hoạt động minh họa, chưa mở đăng ký thật.',
    icon: 'water-outline',
    category: 'Thu gom',
  },
  {
    id: 'workshop',
    title: 'Đổi giấy cũ, gieo mầm xanh',
    day: '07',
    month: 'TH11',
    time: '08:30 – 11:00 · 07/11/2026',
    area: 'Không gian cộng đồng An Hải',
    description:
      'Khám phá hành trình của giấy tái chế và thực hành phân loại giấy. Lịch và địa điểm là dữ liệu tổng hợp phục vụ kiểm tra giao diện.',
    icon: 'flower-outline',
    category: 'Workshop',
  },
  {
    id: 'garden',
    title: 'Vườn nhỏ giữa phố',
    day: '14',
    month: 'TH11',
    time: '15:00 – 17:00 · 14/11/2026',
    area: 'Vườn cộng đồng Hải Châu',
    description:
      'Tìm hiểu cách chăm sóc vườn và xử lý rác hữu cơ. Thông tin minh họa, không phải lời mời tham gia sự kiện thực tế.',
    icon: 'leaf-outline',
    category: 'Workshop',
  },
];
const baseRewards = [
  {
    id: 'tote',
    title: 'Túi vải mỗi ngày xanh',
    category: 'Sống xanh',
    cost: 120,
    icon: 'bag-handle-outline',
    description:
      'Một chiếc túi dùng nhiều lần cho những chuyến đi nhỏ. Hình ảnh và mức điểm chỉ để minh họa giao diện.',
  },
  {
    id: 'bottle',
    title: 'Bình nước cá nhân',
    category: 'Sống xanh',
    cost: 250,
    icon: 'water-outline',
    description:
      'Mang theo bình riêng, bắt đầu một thói quen mới. Sản phẩm demo, chưa có đơn vị cung cấp.',
  },
  {
    id: 'voucher',
    title: 'Voucher cửa hàng xanh',
    category: 'Voucher',
    cost: 300,
    icon: 'ticket-outline',
    description:
      'Ưu đãi minh họa cho trải nghiệm đổi quà. Điều kiện sử dụng và đối tác chưa được thiết lập.',
  },
];
const baseArticles = [
  {
    id: 'small-steps',
    title: 'Bắt đầu sống xanh từ những điều nhỏ',
    tag: 'Lối sống',
    icon: 'sunny-outline',
    body: 'Bắt đầu bằng một việc phù hợp với bạn: mang bình nước, dùng lại túi sẵn có hoặc tách giấy sạch.\n\nQuan sát loại rác thường xuất hiện trong ngày để lựa chọn thói quen dễ duy trì. Không cần làm mọi thứ cùng lúc.\n\nNội dung demo để kiểm tra bố cục bài đọc, chưa thay thế hướng dẫn của đơn vị thu gom tại địa phương.',
  },
  {
    id: 'recycle',
    title: 'Làm sạch trước khi gửi tái chế',
    tag: 'Phân loại',
    icon: 'refresh-outline',
    body: 'Tách chất lỏng và thức ăn còn thừa, giữ vật liệu khô và kiểm tra yêu cầu của điểm tiếp nhận.\n\nKhông phải mọi bao bì đều được thu gom ở mọi nơi. Hãy đọc nhãn và liên hệ điểm thu gom trước khi mang tới.\n\nBài viết minh họa; hướng dẫn thực tế cần có nguồn, địa phương và ngày cập nhật.',
  },
];
const basePosts = [
  {
    id: 'post-1',
    author: 'Linh Chi',
    avatar: 'LC',
    time: '2 giờ trước',
    text: 'Một góc nhỏ để giấy sạch và chai nhựa trong nhà. Bắt đầu từ những điều đơn giản 🌱',
    likes: 24,
  },
  {
    id: 'post-2',
    author: 'Minh An',
    avatar: 'MA',
    time: '4 giờ trước',
    text: 'Cuối tuần này mình dành thời gian tìm hiểu điểm thu gom gần nhà. Có ai cũng đang bắt đầu không?',
    likes: 18,
  },
];

// Synthetic catalog additions. Stable IDs keep list/detail/deep-link examples consistent.
export const wasteItems: WasteItem[] = [
  ...baseWasteItems,
  {
    id: 'plastic-bag',
    name: 'Túi nilon sạch',
    material: 'Nhựa',
    category: 'Tái chế',
    icon: 'bag-outline',
    steps: [
      'Giữ túi sạch, khô và gom riêng.',
      'Tái sử dụng túi còn tốt.',
      'Hỏi điểm tiếp nhận vì không phải nơi nào cũng thu gom nhựa mềm.',
    ],
  },
  {
    id: 'notebook',
    name: 'Vở học sinh cũ',
    material: 'Giấy',
    category: 'Tái chế',
    icon: 'book-outline',
    steps: [
      'Tách bìa nhựa và gáy kim loại nếu có.',
      'Giữ giấy khô và không lẫn thức ăn.',
      'Buộc gọn để dễ vận chuyển.',
    ],
  },
  {
    id: 'jar',
    name: 'Lọ thủy tinh',
    material: 'Thủy tinh',
    category: 'Tái chế',
    icon: 'flask-outline',
    steps: [
      'Ưu tiên dùng lại lọ còn nguyên.',
      'Làm sạch phần chứa bên trong.',
      'Báo trước với điểm thu gom nếu có mảnh vỡ.',
    ],
  },
  {
    id: 'tea',
    name: 'Bã trà & cà phê',
    material: 'Hữu cơ',
    category: 'Hữu cơ',
    icon: 'cafe-outline',
    steps: [
      'Tách bao bì, dây và ghim kim loại.',
      'Gom riêng, tránh để lẫn nhựa.',
      'Kiểm tra hướng dẫn xử lý hữu cơ tại địa phương.',
    ],
  },
];
export const collectionPoints: CollectionPoint[] = [
  ...baseCollectionPoints,
  {
    id: 'glass-corner',
    name: 'Góc thủy tinh xanh',
    address: 'Lô G1, khu phố mô phỏng Hòa Cường, Đà Nẵng',
    area: 'Hải Châu',
    materials: ['Thủy tinh', 'Kim loại'],
    distance: '4,2 km',
    hours: '08:00 – 16:30',
    open: true,
    capacity: 'Còn chỗ · trạng thái minh họa',
  },
  {
    id: 'organic-garden',
    name: 'Vườn ủ cộng đồng',
    address: 'Lô H2, khu dân cư mô phỏng Cẩm Lệ, Đà Nẵng',
    area: 'Cẩm Lệ',
    materials: ['Hữu cơ'],
    distance: '5,6 km',
    hours: '07:00 – 11:00',
    open: false,
    capacity: 'Tạm ngừng tiếp nhận · minh họa',
  },
  {
    id: 'recycle-station',
    name: 'Trạm tái chế cuối tuần',
    address: 'Lô T3, khu phố mô phỏng Liên Chiểu, Đà Nẵng',
    area: 'Liên Chiểu',
    materials: ['Nhựa', 'Giấy', 'Kim loại', 'Thủy tinh'],
    distance: '7,0 km',
    hours: '08:00 – 12:00 · Thứ Bảy',
    open: true,
    capacity: 'Gần đầy · cần xác nhận · minh họa',
  },
];
export const events: GreenEvent[] = [
  ...baseEvents,
  {
    id: 'repair',
    title: 'Sửa đồ cũ, thêm vòng đời mới',
    day: '15',
    month: 'TH11',
    time: '09:00 – 11:30 · 15/11/2026',
    area: 'Xưởng cộng đồng mô phỏng Thanh Khê',
    description:
      'Buổi trao đổi minh họa về sửa đồ và dùng lại vật dụng. Không phải sự kiện đã được xác nhận hoặc đang nhận đăng ký.',
    icon: 'construct-outline',
    category: 'Workshop',
  },
  {
    id: 'river',
    title: 'Dòng sông không rác',
    day: '21',
    month: 'TH11',
    time: '06:30 – 09:00 · 21/11/2026',
    area: 'Điểm hẹn mô phỏng ven sông Hàn',
    description:
      'Dữ liệu mẫu cho hoạt động thu gom theo nhóm. Thời gian, địa điểm và người tổ chức đều dùng cho demo frontend.',
    icon: 'water-outline',
    category: 'Thu gom',
  },
  {
    id: 'swap',
    title: 'Ngày hội trao đổi đồ dùng',
    day: '28',
    month: 'TH11',
    time: '08:00 – 11:00 · 28/11/2026',
    area: 'Không gian xanh mô phỏng Sơn Trà',
    description:
      'Thử trải nghiệm khám phá hoạt động, lưu lịch và xem chi tiết. Không có giao dịch trao đổi hoặc giữ chỗ thật.',
    icon: 'swap-horizontal-outline',
    category: 'Workshop',
  },
];
export const rewards = [
  ...baseRewards,
  {
    id: 'seed',
    title: 'Bộ hạt giống ban công',
    category: 'Sống xanh',
    cost: 80,
    icon: 'flower-outline',
    description:
      'Quà mẫu có giá thấp hơn số dư demo để kiểm tra nhánh đủ điểm. Không phải sản phẩm đang được phân phối.',
  },
  {
    id: 'notebook',
    title: 'Sổ tay giấy tái chế',
    category: 'Sống xanh',
    cost: 150,
    icon: 'book-outline',
    description: 'Sổ mẫu phục vụ màn xem trước phần thưởng. Không phát sinh đơn hàng khi xem.',
  },
  {
    id: 'cafe',
    title: 'Voucher đồ uống mang bình riêng',
    category: 'Voucher',
    cost: 200,
    icon: 'cafe-outline',
    description: 'Voucher hoàn toàn giả lập, không có mã sử dụng hoặc đối tác thật.',
  },
];
export const articles = [
  ...baseArticles,
  {
    id: 'battery-care',
    title: 'Gom pin cũ thành một thói quen riêng',
    tag: 'Phân loại',
    icon: 'battery-half-outline',
    body: 'Đặt pin cũ ở nơi khô ráo, tránh nhiệt và không tháo mở. Không trộn pin với rác sinh hoạt.\n\nHỏi đơn vị tiếp nhận chuyên biệt về cách đóng gói phù hợp với loại pin.\n\nBài đọc mẫu cho frontend; hướng dẫn thực tế cần nguồn chuyên môn và quy định địa phương.',
  },
  {
    id: 'reuse',
    title: 'Mang theo đồ dùng lại khi ra ngoài',
    tag: 'Lối sống',
    icon: 'bag-handle-outline',
    body: 'Chọn một món đồ bạn đã có, như túi vải hoặc bình nước, rồi đặt gần cửa để dễ nhớ.\n\nThử duy trì một thói quen nhỏ thay vì mua thêm nhiều đồ cùng lúc.\n\nNội dung tổng hợp cho bản demo, không phải số liệu nghiên cứu về tác động môi trường.',
  },
  {
    id: 'community-day',
    title: 'Chuẩn bị cho một buổi thu gom cộng đồng',
    tag: 'Cộng đồng',
    icon: 'people-outline',
    body: 'Đọc kỹ thông tin từ đơn vị tổ chức, chuẩn bị nước uống và trang phục phù hợp.\n\nKhông tự xử lý vật sắc nhọn hoặc vật liệu nguy hại. Hỏi người phụ trách khi gặp vật chưa rõ.\n\nBài viết minh họa, không phải hướng dẫn vận hành một sự kiện cụ thể.',
  },
];
export const initialPosts = [
  ...basePosts,
  {
    id: 'post-3',
    author: 'Thu Hà',
    avatar: 'TH',
    time: 'Hôm qua',
    text: 'Mình mang theo bình nước được một tuần rồi. Mẹo nhỏ là đặt bình ngay cạnh chìa khóa mỗi tối.',
    likes: 32,
  },
  {
    id: 'post-4',
    author: 'Quang Huy',
    avatar: 'QH',
    time: 'Hôm qua',
    text: 'Giấy khô mình buộc thành từng bó nhỏ. Sắp tới sẽ tìm nơi tiếp nhận phù hợp trong khu vực.',
    likes: 15,
  },
  {
    id: 'post-5',
    author: 'Nhóm Sống Xanh · Demo',
    avatar: 'SX',
    time: '2 ngày trước',
    text: 'Một lời nhắc nhỏ: đừng trộn pin cũ với rác sinh hoạt. Hãy tra sổ tay và hỏi điểm tiếp nhận chuyên biệt nhé.',
    likes: 46,
  },
];
