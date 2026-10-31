import { articles } from './fixtures';

export type NewsArticle = (typeof articles)[number];
export type ArticleComment = {
  id: number;
  articleId: string;
  author: string;
  text: string;
  likes: number;
  mine: boolean;
  replyTo?: number;
};
export type NewsSession = {
  recentSearches: string[];
  interestedEvents: string[];
  savedEvents: string[];
  saved: string[];
  liked: string[];
  followedTopics: string[];
  likedComments: number[];
  comments: ArticleComment[];
};
export const newsTopics = [
  {
    id: 'Môi trường',
    icon: 'earth-outline',
    description: 'Những câu chuyện về hành tinh chúng ta.',
  },
  { id: 'Phân loại', icon: 'layers-outline', description: 'Hiểu vật liệu, bắt đầu từ việc nhỏ.' },
  { id: 'Lối sống', icon: 'leaf-outline', description: 'Gợi ý cho một ngày sống xanh hơn.' },
  { id: 'Cộng đồng', icon: 'people-outline', description: 'Cùng nhau góp sức cho thay đổi.' },
] as const;

/** Editorial metadata is synthetic; counts never represent a user's environmental impact. */
export const articleMetadata: Record<
  string,
  { date: string; minutes: number; views: number; likes: number; summary: string }
> = {
  'youth-ideas': {
    date: '2026-10-18',
    minutes: 3,
    views: 1900,
    likes: 20,
    summary:
      'Bài đọc mẫu theo thẻ ý tưởng của các bạn trẻ trong thiết kế Figma; nội dung và hoạt động chưa được xác minh.',
  },
  'storm-cleanup': {
    date: '2026-10-24',
    minutes: 3,
    views: 1200,
    likes: 50,
    summary: 'Bài đọc mẫu từ thiết kế về rác thải và hoạt động cộng đồng.',
  },
  'green-sunday': {
    date: '2026-10-23',
    minutes: 3,
    views: 2200,
    likes: 170,
    summary: 'Tiêu đề và ảnh minh họa trong Figma; thông tin nhân vật chưa được xác minh.',
  },
  'local-cleanup': {
    date: '2026-10-22',
    minutes: 3,
    views: 1500,
    likes: 40,
    summary: 'Minh họa giao diện cho câu chuyện thu gom tại địa phương.',
  },
  'saigon-cleanup': {
    date: '2026-10-21',
    minutes: 3,
    views: 1200,
    likes: 50,
    summary: 'Bài mẫu theo ảnh và tiêu đề thiết kế, chưa phải tin đã biên tập.',
  },
  'ha-long': {
    date: '2026-10-20',
    minutes: 3,
    views: 1200,
    likes: 50,
    summary: 'Mẫu UI bài đọc về rác thải tại địa điểm trong thiết kế.',
  },
  'tourism-cleanup': {
    date: '2026-10-19',
    minutes: 3,
    views: 1200,
    likes: 50,
    summary: 'Nội dung mẫu cho màn bài viết đã lưu, chưa xác minh sự kiện thực tế.',
  },
  'small-steps': {
    date: '2026-10-29',
    minutes: 3,
    views: 1200,
    likes: 50,
    summary: 'Một bình nước, chiếc túi quen và những việc vừa sức cho ngày đầu sống xanh.',
  },
  recycle: {
    date: '2026-10-28',
    minutes: 4,
    views: 950,
    likes: 42,
    summary: 'Giữ vật liệu sạch, khô và tìm hiểu yêu cầu của điểm tiếp nhận.',
  },
  'battery-care': {
    date: '2026-10-27',
    minutes: 3,
    views: 720,
    likes: 36,
    summary: 'Dành một góc riêng cho pin cũ, tìm điểm tiếp nhận phù hợp.',
  },
  reuse: {
    date: '2026-10-26',
    minutes: 2,
    views: 860,
    likes: 40,
    summary: 'Tận dụng những gì đã có để tạo một thói quen dùng lại.',
  },
  'community-day': {
    date: '2026-10-25',
    minutes: 5,
    views: 1700,
    likes: 65,
    summary: 'Những điều cần chuẩn bị trước khi tham gia một hoạt động cộng đồng.',
  },
  'daily-waste': {
    date: '2026-10-30',
    minutes: 5,
    views: 2200,
    likes: 170,
    summary: 'Bắt đầu từ phân loại, giảm đồ dùng một lần và tham gia cùng cộng đồng.',
  },
};
export const createNewsSession = (): NewsSession => ({
  recentSearches: [],
  interestedEvents: [],
  savedEvents: [],
  saved: [],
  liked: [],
  followedTopics: [],
  likedComments: [],
  comments: [
    {
      id: 1,
      articleId: 'small-steps',
      author: 'Minh An · Mẫu',
      text: 'Mình đặt bình nước ngay cạnh túi đi làm để dễ nhớ.',
      likes: 3,
      mine: false,
    },
    {
      id: 2,
      articleId: 'recycle',
      author: 'Thu Hà · Mẫu',
      text: 'Mình sẽ hỏi lại điểm thu gom về loại bao bì đang có.',
      likes: 2,
      mine: false,
    },
  ],
});
export const normalizeNewsSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
export function filterNews(
  items: NewsArticle[],
  options: {
    search: string;
    topic: string;
    sort: 'newest' | 'popular' | 'saved';
    savedIds?: string[];
  },
) {
  const term = normalizeNewsSearch(options.search);
  const topic =
    options.topic === 'Tái chế'
      ? 'Phân loại'
      : options.topic === 'Sự kiện'
        ? 'Cộng đồng'
        : options.topic;
  return items
    .filter(
      (article) =>
        (!options.savedIds || options.savedIds.includes(article.id)) &&
        (topic === 'Tất cả' || topic === article.tag) &&
        normalizeNewsSearch(`${article.title} ${article.tag} ${article.body}`).includes(term),
    )
    .sort((left, right) => {
      if (options.sort === 'saved' && options.savedIds)
        return options.savedIds.indexOf(left.id) - options.savedIds.indexOf(right.id);
      const a = articleMetadata[left.id]!;
      const b = articleMetadata[right.id]!;
      return options.sort === 'popular'
        ? b.views - a.views || b.date.localeCompare(a.date)
        : b.date.localeCompare(a.date);
    });
}
export function appendArticleComment(
  session: NewsSession,
  articleId: string,
  text: string,
  replyTo?: number,
): NewsSession {
  const content = text.trim();
  if (!content || content.length > 500 || !articles.some((article) => article.id === articleId))
    return session;
  if (
    replyTo !== undefined &&
    !session.comments.some((comment) => comment.id === replyTo && comment.articleId === articleId)
  )
    return session;
  return {
    ...session,
    comments: [
      ...session.comments,
      {
        id: Math.max(0, ...session.comments.map((comment) => comment.id)) + 1,
        articleId,
        author: 'Bạn · Demo',
        text: content,
        likes: 0,
        mine: true,
        replyTo,
      },
    ],
  };
}

/** Removing your own comment preserves replies as standalone messages in this local demo. */
export function removeArticleComment(
  session: NewsSession,
  articleId: string,
  commentId: number,
): NewsSession {
  if (
    !session.comments.some(
      (comment) => comment.id === commentId && comment.articleId === articleId && comment.mine,
    )
  )
    return session;
  return {
    ...session,
    comments: session.comments
      .filter((comment) => comment.id !== commentId)
      .map((comment) =>
        comment.replyTo === commentId ? { ...comment, replyTo: undefined } : comment,
      ),
    likedComments: session.likedComments.filter((id) => id !== commentId),
  };
}
