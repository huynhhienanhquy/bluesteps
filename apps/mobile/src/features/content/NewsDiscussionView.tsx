import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { newsDesignAssets } from '../../design-system/news-design-assets';
import { articles } from '../../services/fixtures';
import {
  appendArticleComment,
  articleMetadata,
  createNewsSession,
  removeArticleComment,
  type NewsSession,
} from '../../services/news';
import { EventRoleOption, EventTextAction } from '../events/EventFormParts';
import { ArticleMissing } from './NewsParts';
import { NewsAction, NewsDesignPage, NewsSheet, NewsText as T } from './NewsDesignParts';
import { newsCover } from './news-design-data';

const a = newsDesignAssets['609:5361'];
const initials = (name: string) => {
  const words = name.split('·')[0]!.trim().split(/\s+/);
  return `${words[0]?.[0] ?? ''}${words.length > 1 ? (words.at(-1)?.[0] ?? '') : ''}`.toUpperCase();
};
const previewTimes: Record<number, string> = {
  101: '2 giờ trước',
  102: '5 giờ trước',
  103: 'Hôm qua',
};
const previewComments = [
  {
    id: 101,
    author: 'Minh Trang',
    text: 'Bài viết rất hữu ích! Mình sẽ bắt đầu phân loại rác tại nhà từ hôm nay.',
    likes: 12,
  },
  {
    id: 102,
    author: 'Hoàng Anh',
    text: 'Nhóm mình đang tổ chức dọn rác cuối tuần. Ai muốn tham gia cùng không?',
    likes: 8,
  },
  {
    id: 103,
    author: 'Linh Nguyễn',
    text: 'Cảm ơn GreenSteps đã chia sẻ thông tin dễ hiểu và thiết thực.',
    likes: 5,
  },
];

export function NewsDiscussionScreen() {
  const params = useLocalSearchParams<{ id?: string; preview?: string }>();
  const sample = params.preview === '1';
  const id = typeof params.id === 'string' ? params.id : sample ? 'daily-waste' : undefined;
  const article = articles.find((item) => item.id === id);
  const { news, setNews } = useApp();
  const [example, setExample] = useState<NewsSession>(() => ({
    ...createNewsSession(),
    comments: previewComments.map((comment) => ({
      ...comment,
      articleId: article?.id ?? 'daily-waste',
      mine: false,
    })),
  }));
  const session = sample ? example : news;
  const update = sample ? setExample : setNews;
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<number>();
  const [sort, setSort] = useState<'newest' | 'popular' | 'oldest'>(sample ? 'oldest' : 'newest');
  const [status, setStatus] = useState('');
  const [sheet, setSheet] = useState<'sort' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState<number>();
  const [editing, setEditing] = useState(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const comments = session.comments
    .filter((comment) => comment.articleId === article?.id)
    .sort((left, right) =>
      sort === 'newest'
        ? right.id - left.id
        : sort === 'oldest'
          ? left.id - right.id
          : right.likes +
              Number(session.likedComments.includes(right.id)) -
              left.likes -
              Number(session.likedComments.includes(left.id)) || right.id - left.id,
    );
  const replying = session.comments.find(
    (comment) => comment.id === replyTo && comment.articleId === article?.id,
  );
  const send = () => {
    if (!article || !draft.trim()) {
      setStatus('Nhập nội dung thảo luận trước khi đăng.');
      return;
    }
    if (draft.trim().length > 500) {
      setStatus('Nội dung tối đa 500 ký tự.');
      return;
    }
    if (replyTo !== undefined && !replying) {
      setReplyTo(undefined);
      setStatus('Bình luận gốc không còn trong bài viết. Hãy gửi lại dưới dạng bình luận mới.');
      return;
    }
    update((current) => appendArticleComment(current, article.id, draft, replyTo));
    setDraft('');
    setReplyTo(undefined);
    setEditing(false);
    setStatus(
      sample
        ? 'Đã thêm thảo luận trong bản xem trước. Dữ liệu phiên không thay đổi.'
        : 'Đã thêm thảo luận trong phiên demo.',
    );
  };
  return (
    <NewsDesignPage title="Thảo luận" frame="609:5361" backTo="/articles">
      {!article ? (
        <View style={{ marginTop: 26 }}>
          <ArticleMissing />
        </View>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Về bài viết"
            accessibilityHint={article.title}
            onPress={() => router.dismissTo(`/articles/${article.id}${sample ? '?preview=1' : ''}`)}
            style={{
              marginTop: 26,
              height: 250,
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            <Artwork
              source={article.id === 'daily-waste' ? a.imgFrame : newsCover(article)}
              width={356}
              height={154}
              fit="cover"
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                top: 12,
                width: 'auto',
                borderRadius: 12,
              }}
            />
            <T
              size={15}
              weight="bold"
              color="#142A3D"
              numberOfLines={2}
              style={{ position: 'absolute', left: 16, right: 18, top: 178 }}
            >
              {sample && article.id === 'daily-waste'
                ? 'Mỗi ngày, thế giới thải ra khoảng 11 triệu tấn rác'
                : article.title}
            </T>
            <T size={11} color="#5E7484" style={{ position: 'absolute', left: 16, top: 224 }}>
              {sample ? 'Tái chế' : article.tag} · {articleMetadata[article.id]!.minutes} phút đọc
              {sample ? '' : ' · Mẫu'}
            </T>
          </Pressable>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              height: 24,
              marginTop: 25,
            }}
          >
            <T accessibilityRole="header" size={18} weight="bold" color="#163044">
              Bình luận
            </T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sắp xếp thảo luận"
              onPress={() => setSheet('sort')}
              hitSlop={10}
              style={{ width: 86, marginTop: 5 }}
            >
              <T size={12} color="#617787">
                {comments.length} ý kiến
              </T>
            </Pressable>
          </View>
          <View style={{ gap: 10, marginTop: 16 }}>
            {!comments.length ? (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, gap: 8 }}>
                <T size={14} weight="semibold" color="#193446">
                  Chưa có thảo luận cho bài viết
                </T>
                <T size={12} color="#617787">
                  Chia sẻ một ý tưởng nhỏ để bắt đầu câu chuyện.
                </T>
              </View>
            ) : (
              comments.map((comment) => {
                const parent = session.comments.find(
                  (item) => item.id === comment.replyTo && item.articleId === article.id,
                );
                const liked = session.likedComments.includes(comment.id);
                return (
                  <View
                    key={comment.id}
                    testID={`article-comment-${comment.id}`}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      minHeight: 95,
                      paddingTop: 14,
                      paddingLeft: 59,
                      paddingRight: 16,
                      paddingBottom: 11.69,
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: 13,
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: '#DCF1FB',
                      }}
                    >
                      <T
                        size={11}
                        weight="bold"
                        color="#1975B5"
                        style={{ position: 'absolute', left: 6, top: 9 }}
                      >
                        {initials(comment.author)}
                      </T>
                    </View>
                    <T
                      size={13}
                      weight="bold"
                      color="#193446"
                      style={{ minHeight: 15.73, paddingRight: 85 }}
                    >
                      {comment.author}
                    </T>
                    <T
                      size={10}
                      color="#708696"
                      style={{ position: 'absolute', right: 8, top: 17, width: 100 }}
                    >
                      {sample
                        ? (previewTimes[comment.id] ?? 'Vừa xong')
                        : comment.mine
                          ? 'Vừa xong'
                          : 'Trong phiên demo'}
                    </T>
                    {parent ? (
                      <T size={10} color="#617787" style={{ marginTop: 7 }}>
                        Trả lời {parent.author}: {parent.text}
                      </T>
                    ) : null}
                    <T size={11} color="#3B5162" style={{ minHeight: 26.62, marginTop: 7.27 }}>
                      {comment.text}
                    </T>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 13.31,
                        marginTop: 6.38,
                        marginRight: -1,
                      }}
                    >
                      {!sample ? (
                        <View style={{ flexDirection: 'row', gap: 14 }}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Trả lời ${comment.author}`}
                            hitSlop={10}
                            onPress={() => {
                              setReplyTo(comment.id);
                              setStatus('');
                              input.current?.focus();
                            }}
                          >
                            <T size={11} color="#217EBB">
                              Trả lời
                            </T>
                          </Pressable>
                          {comment.mine ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Xóa bình luận: ${comment.text}`}
                              hitSlop={10}
                              onPress={() => {
                                setDeleting(comment.id);
                                setSheet('delete');
                              }}
                            >
                              <T size={11} color="#217EBB">
                                Xóa
                              </T>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : (
                        <View />
                      )}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${liked ? 'Bỏ thích' : 'Thích'} bình luận của ${comment.author}`}
                        accessibilityState={{ selected: liked }}
                        hitSlop={10}
                        style={{ flexDirection: 'row', gap: 4, minWidth: sample ? 60 : undefined }}
                        onPress={() =>
                          update((current) => ({
                            ...current,
                            likedComments: current.likedComments.includes(comment.id)
                              ? current.likedComments.filter((value) => value !== comment.id)
                              : [...current.likedComments, comment.id],
                          }))
                        }
                      >
                        <T size={11} weight="semibold" color="#217EBB">
                          {liked ? '♥' : '♡'}
                        </T>
                        <T size={11} weight="semibold" color="#217EBB">
                          {comment.likes + Number(liked)}
                          {sample ? '' : ' lượt thích'}
                        </T>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
          {replying ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <T size={12} color="#617787">
                Đang trả lời {replying.author}
              </T>
              <EventTextAction title="Hủy trả lời" onPress={() => setReplyTo(undefined)} />
            </View>
          ) : null}
          <View
            style={{
              marginTop: 12,
              height: editing && !sample ? 96 : 48,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#C4DFED',
              borderRadius: 18,
            }}
          >
            <TextInput
              ref={input}
              accessibilityLabel="Nội dung thảo luận bài viết"
              placeholder="Viết bình luận..."
              placeholderTextColor="#8599A8"
              value={draft}
              onChangeText={(value) => {
                setDraft(value);
                setStatus('');
              }}
              onFocus={() => setEditing(true)}
              multiline
              maxLength={500}
              style={{
                marginRight: 48,
                height: '100%',
                paddingHorizontal: 13,
                paddingTop: 13,
                paddingBottom: 10,
                fontFamily: 'BackupInter_400Regular',
                fontSize: 13,
                lineHeight: 15.73,
                color: '#3B5162',
                textAlignVertical: 'top',
                includeFontPadding: false,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đăng thảo luận trong demo"
              onPress={send}
              hitSlop={6}
              style={{
                position: 'absolute',
                right: 10,
                bottom: 7,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#1880C7',
              }}
            >
              <T
                size={18}
                weight="bold"
                color="#FFFFFF"
                style={{ position: 'absolute', left: 10, top: 5 }}
              >
                ↑
              </T>
            </Pressable>
          </View>
          {!sample ? (
            <T size={11} color="#617787" style={{ marginTop: 10 }}>
              {draft.length}/500 ký tự · Thảo luận chỉ lưu trong phiên demo.
            </T>
          ) : null}
          {status ? (
            <T accessibilityRole="alert" size={12} color="#217EBB" style={{ marginTop: 12 }}>
              {status}
            </T>
          ) : null}
          {sheet ? (
            <NewsSheet
              title={sheet === 'delete' ? 'Xóa bình luận của bạn?' : 'Sắp xếp thảo luận'}
              onClose={() => setSheet(null)}
            >
              {sheet === 'sort' ? (
                (
                  [
                    ['newest', 'Mới nhất'],
                    ['popular', 'Nổi bật'],
                    ['oldest', 'Cũ nhất'],
                  ] as const
                ).map(([value, label]) => (
                  <EventRoleOption
                    key={value}
                    value={label}
                    selected={sort === value}
                    onPress={() => {
                      setSort(value);
                      setSheet(null);
                    }}
                  />
                ))
              ) : (
                <>
                  <T size={12} color="#617787">
                    Phản hồi của người khác vẫn được giữ dưới dạng bình luận độc lập.
                  </T>
                  <NewsAction
                    title="Xác nhận xóa bình luận"
                    onPress={() => {
                      if (deleting !== undefined) {
                        update((current) => removeArticleComment(current, article.id, deleting));
                        if (replyTo === deleting) setReplyTo(undefined);
                      }
                      setSheet(null);
                      setDeleting(undefined);
                      setStatus('Đã xóa bình luận trong phiên demo.');
                    }}
                  />
                  <EventTextAction title="Giữ bình luận" onPress={() => setSheet(null)} />
                </>
              )}
              <EventTextAction title="Đóng tùy chọn thảo luận" onPress={() => setSheet(null)} />
            </NewsSheet>
          ) : null}
        </>
      )}
    </NewsDesignPage>
  );
}
