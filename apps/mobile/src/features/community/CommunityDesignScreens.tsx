import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { DesignFrameCanvas, DesignFrameAction as Hit } from '../../design-system/DesignFrameCanvas';
import type {
  FrameData,
  DesignLayer,
  ImageReplacement,
} from '../../design-system/DesignFrameLayers';
import { communityAssets } from '../../design-system/community-assets';
import { Artwork } from '../../design-system/DesignScreen';
import { Button, Label } from '../../design-system/ui';
import { CollectionSheet } from '../collection/CollectionPage';
import { useApp } from '../../providers';
import { useCommunityUi, type CommunityPostId } from './CommunityUiProvider';
import source from './community-design-data.json';

type Frame = keyof typeof communityAssets;
type ViewName =
  'feed' | 'explore' | 'members' | 'topics' | 'post' | 'member' | 'saved' | 'comment' | 'options';
const data = source as unknown as Record<Frame, FrameData & { navigationTop: number | null }>;
const frames: Record<ViewName, Frame> = {
  feed: '386:7647',
  explore: '722:5570',
  members: '733:5722',
  topics: '733:5787',
  post: '722:5635',
  member: '722:5699',
  saved: '722:5749',
  comment: '723:5646',
  options: '723:5809',
};
const sampleComment = 'Tuyệt quá! Mình cũng sẽ bắt đầu phân loại rác từ hôm nay 🌱';
const members = [
  { id: 'healing', name: 'Healing', bio: 'Chia sẻ về sống xanh', image: 'imgAvatar' },
  { id: 'linh', name: 'Linh Chi', bio: 'Cùng nhau dọn sạch góc phố', image: 'imgAvatar1' },
  { id: 'duyen', name: 'Mỹ Duyên', bio: 'Yêu phân loại và tái chế', image: 'imgAvatar2' },
];
const topics = ['Phân loại rác', 'Sống xanh mỗi ngày', 'Hoạt động cộng đồng'];
const posts = [
  { id: 'healing' as const, title: 'Một ngày phân loại rác cùng bạn bè' },
  { id: 'save' as const, title: 'Hành trình xanh bắt đầu từ việc nhỏ' },
];
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('đ', 'd')
    .toLowerCase()
    .trim();
const matches = (text: string, q: string) =>
  !q ||
  normalize(text).includes(normalize(q)) ||
  ['tai che', 'phan loai rac', 'song xanh moi ngay', 'hoat dong cong dong'].includes(normalize(q));
const image = (frame: Frame, key: string) =>
  (communityAssets[frame] as Record<string, number>)[key]!;
const postOf = (id?: string): CommunityPostId =>
  id === 'save' || id === 'post-2' ? 'save' : id === 'linh' || id === 'post-3' ? 'linh' : 'healing';
const viewOf = (frame: Frame): ViewName =>
  frame === '386:7813'
    ? 'feed'
    : frame === '734:5760' || frame === '723:5722'
      ? 'post'
      : frame === '723:5892'
        ? 'member'
        : ((Object.keys(frames) as ViewName[]).find((v) => frames[v] === frame) ?? 'feed');
const go = (view: ViewName, params: Record<string, string> = {}) =>
  router.push({ pathname: '/community', params: { view, ...params } });
const back = () => (router.canGoBack() ? router.back() : router.replace('/community'));
type Row = { id: string; y: number; h: number };
function filteredRows(
  layers: DesignLayer[],
  rows: Row[],
  visible: string[],
  start = rows[0]?.y ?? 0,
) {
  const positions = new Map<string, number>();
  let next = start;
  rows.forEach((row, index) => {
    if (visible.includes(row.id)) {
      positions.set(row.id, next);
      const gap = rows[index + 1] ? rows[index + 1]!.y - row.y - row.h : 14;
      next += row.h + gap;
    }
  });
  return layers.flatMap((l) => {
    if (l.navigation) return [l];
    const row = rows.find((r) => l.y >= r.y && l.y < r.y + r.h);
    if (!row) return [l];
    const y = positions.get(row.id);
    return y === undefined ? [] : [{ ...l, y: l.y + y - row.y }];
  });
}

export function CommunityDesignScreen({ initialView = 'feed' }: { initialView?: ViewName }) {
  const params = useLocalSearchParams<{
    view?: string;
    frame?: string;
    preview?: string;
    postId?: string;
    member?: string;
    q?: string;
  }>();
  const ui = useCommunityUi(),
    app = useApp();
  const sample = params.preview === '1';
  const requested =
    params.frame && params.frame in communityAssets ? (params.frame as Frame) : undefined;
  const view = requested
    ? viewOf(requested)
    : params.view && params.view in frames
      ? (params.view as ViewName)
      : initialView;
  const postId = postOf(params.postId),
    liked = ui.state.liked.includes(postId);
  const selectedMember =
    params.member === 'save'
      ? { id: 'save', name: 'Save', bio: 'Sống xanh mỗi ngày', image: 'imgAvatar1' }
      : (members.find((m) => m.id === params.member) ?? members[0]!);
  const comments = ui.state.comments[postId];
  let frame: Frame = requested ?? frames[view];
  if (!requested) {
    if (view === 'feed' && ui.state.liked.includes('healing')) frame = '386:7813';
    if (view === 'post') frame = liked ? '734:5760' : comments.length ? '723:5722' : '722:5635';
    if (view === 'member' && ui.state.following.includes(selectedMember.id)) frame = '723:5892';
  }
  const [query, setQuery] = useState(
    params.q ?? (sample && ['explore', 'members', 'topics'].includes(view) ? 'tái chế' : ''),
  );
  const [comment, setComment] = useState(sample ? sampleComment : ui.state.draft);
  const [error, setError] = useState(false);
  const [caps, setCaps] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [extraSheet, setExtraSheet] = useState(false);
  const [ownHeights, setOwnHeights] = useState<Record<string, number>>({});
  const explore = ['explore', 'members', 'topics'].includes(view);
  const matchedPosts = posts.filter((p) => matches(p.title + ' ' + p.id, query));
  const matchedMembers = members.filter((m) => matches(m.name + ' ' + m.bio, query));
  const matchedTopics = topics.filter((t) => matches(t, query));
  const ownPosts = !sample ? app.posts.filter((p) => p.id.startsWith('draft-')) : [];
  const ownOffset = ownPosts.reduce((sum, post) => sum + (ownHeights[post.id] ?? 166), 0);
  let layout = data[frame];
  if (!sample) {
    let layers = [...layout.layers];
    if (view === 'feed') {
      const cards = layers
        .filter((l) => l.kind === 'shape' && l.w === 428 && l.h === 356 && l.y >= 320)
        .map((l, i) => ({ id: i === 0 ? 'healing' : 'save-' + i, y: l.y, h: 366 }));
      const visible = cards
        .filter((r) => !ui.state.hidden.includes(r.id === 'healing' ? 'healing' : 'save'))
        .map((r) => r.id);
      layers = filteredRows(layers, cards, visible);
      layers = layers.map((l) => (!l.navigation && l.y >= 320 ? { ...l, y: l.y + ownOffset } : l));
    }
    if (view === 'saved')
      layers = filteredRows(
        layers,
        [
          { id: 'healing', y: 273, h: 265 },
          { id: 'save', y: 552, h: 124 },
          { id: 'linh', y: 691, h: 104 },
        ],
        ui.state.saved,
      );
    if (view === 'explore')
      layers = filteredRows(
        layers,
        [
          { id: 'healing', y: 313, h: 137 },
          { id: 'save', y: 462, h: 137 },
        ],
        matchedPosts.map((p) => p.id),
      );
    if (view === 'members')
      layers = filteredRows(
        layers,
        members.map((m, i) => ({ id: m.id, y: 313 + i * 130, h: 114 })),
        matchedMembers.map((m) => m.id),
      );
    if (view === 'topics')
      layers = filteredRows(
        layers,
        topics.map((t, i) => ({ id: t, y: 313 + i * 135, h: 119 })),
        matchedTopics,
      );
    layout = { ...layout, layers };
  }
  const contentHeight =
    view === 'feed'
      ? Math.max(926, ...layout.layers.filter((l) => !l.navigation).map((l) => l.y + l.h + 20))
      : 926;
  const openPost = (id: CommunityPostId = postId) => go('post', { postId: id });
  const member = (id = selectedMember.id) => go('member', { member: id });
  const openComment = () => go('comment', { postId });
  const submit = () => {
    if (!ui.addComment(postId, comment)) {
      setError(true);
      return;
    }
    router.replace({ pathname: '/community', params: { view: 'post', postId } });
  };
  const setDraft = (value: string) => {
    setComment(value.slice(0, 500));
    ui.setDraft(value);
    setError(false);
  };
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(`bluesteps://community/${postId}`);
      setFeedback('Đã sao chép liên kết');
    } catch {
      setFeedback('Liên kết bài đăng: bluesteps://community/' + postId);
    }
  };
  const hide = (l: DesignLayer) => {
    if (explore && l.text === 'tái chế') return true;
    if (view === 'feed' && l.text?.startsWith('Tìm kiếm')) return true;
    if (view === 'comment' && l.id === '723:5659') return true;
    if (view === 'comment' && !sample && Platform.OS !== 'web' && l.y >= 533) return true;
    return false;
  };
  const replaceText = (l: DesignLayer) => {
    if (view === 'comment' && l.text === '58/500')
      return sample ? undefined : `${comment.length}/500`;
    if (view === 'comment' && !caps && l.y >= 580 && /^[A-Z]$/.test(l.text ?? ''))
      return l.text!.toLowerCase();
    if (sample) return undefined;
    if (view === 'saved' && l.text === '3 bài đăng để đọc lại')
      return `${ui.state.saved.length} bài đăng để đọc lại`;
    if (view === 'options' && l.text === 'Lưu bài đăng')
      return ui.state.saved.includes(postId) ? 'Bỏ lưu bài đăng' : 'Lưu bài đăng';
    if (view === 'members' && l.text === 'Theo dõi') {
      const row = matchedMembers[Math.round((l.y - 350) / 130)];
      if (row && ui.state.following.includes(row.id)) return 'Đã theo';
    }
    if (view === 'explore' && l.text === 'Theo dõi')
      return ui.state.following.includes('healing') ? 'Đã theo' : undefined;
    if (view === 'explore' && l.text === '2 bài viết') return `${matchedPosts.length} bài viết`;
    if (view === 'members' && l.text === '3 thành viên')
      return `${matchedMembers.length} thành viên`;
    if (view === 'topics' && l.text === '3 chủ đề') return `${matchedTopics.length} chủ đề`;
    if (view === 'member' && l.text === 'Healing') return selectedMember.name;
    if ((view === 'post' || view === 'comment' || view === 'options') && l.text === 'Healing')
      return postId === 'save' ? 'Save' : postId === 'linh' ? 'Linh Chi' : undefined;
    if (view === 'post') {
      if (l.text?.includes('bình luận') && l.y >= 500 && l.y < 530)
        return `◉ ${5 + comments.length} bình luận`;
      if (comments.length && l.y >= 700 && l.y < 770) {
        if (l.text === 'Thu Phương' || l.text === 'Bạn · Vừa xong') return 'Bạn · Vừa xong';
        if (l.text === 'Rất tuyệt, cùng cố gắng nhé!' || l.text?.startsWith('Tuyệt quá!'))
          return comments.at(-1)!.text;
      }
    }
    return undefined;
  };
  const replaceImage = (l: DesignLayer): ImageReplacement | undefined => {
    if (sample || l.kind !== 'image') return undefined;
    if (
      view === 'member' &&
      selectedMember.id !== 'healing' &&
      l.y >= 280 &&
      l.y < 300 &&
      l.w === 90
    )
      return image('733:5722', selectedMember.image);
    if (
      (view === 'post' || view === 'options') &&
      postId !== 'healing' &&
      l.y === 158 &&
      l.w === 48
    )
      return image('733:5722', 'imgAvatar1');
    return undefined;
  };
  const followLabel = (id: string, name: string) =>
    `${ui.state.following.includes(id) ? 'Bỏ theo dõi' : 'Theo dõi'} ${name}`;
  const memberRows = sample ? members : matchedMembers;
  const topicRows = sample ? topics : matchedTopics;
  const postRows = sample ? posts : matchedPosts;
  const empty =
    explore &&
    !sample &&
    (view === 'explore'
      ? !matchedPosts.length
      : view === 'members'
        ? !matchedMembers.length
        : !matchedTopics.length);
  return (
    <>
      <DesignFrameCanvas
        frame={frame}
        data={layout}
        assets={communityAssets[frame]}
        fixed={view === 'options'}
        contentHeight={contentHeight}
        hide={hide}
        replaceText={replaceText}
        replaceImage={replaceImage}
      >
        {view !== 'options' ? <Hit label="Quay lại" box={[14, 58, 44, 46]} onPress={back} /> : null}
        {view === 'feed' ? (
          <>
            <Hit
              label="Thông báo cộng đồng"
              box={[322, 57, 41, 43]}
              onPress={() => router.push('/notifications?view=community')}
            />
            <Hit label="Bài đã lưu" box={[365, 57, 43, 43]} onPress={() => go('saved')} />
            <TextInput
              accessibilityLabel="Tìm kiếm cộng đồng"
              value={query}
              placeholder="Tìm kiếm ...."
              placeholderTextColor="#000000"
              onChangeText={setQuery}
              onSubmitEditing={() => go('explore', { q: query })}
              returnKeyType="search"
              style={{
                position: 'absolute',
                left: 40,
                top: 149,
                width: 330,
                height: 30,
                padding: 0,
                fontFamily: 'BackupInter_400Regular',
                fontSize: 14,
                color: '#000000',
              }}
            />
            <Hit
              label="Hôm nay bạn nghĩ gì?"
              box={[70, 231, 300, 76]}
              onPress={() => router.push('/compose')}
            />
            <Hit
              label="Thêm ảnh vào bài viết"
              box={[367, 242, 36, 43]}
              onPress={() => router.push('/compose')}
            />
            {ownPosts.map((post, i) => (
              <View
                key={post.id}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height + 16;
                  if (Math.abs(h - (ownHeights[post.id] ?? 166)) > 1)
                    setOwnHeights((s) => ({ ...s, [post.id]: h }));
                }}
                style={{
                  position: 'absolute',
                  top:
                    320 +
                    ownPosts.slice(0, i).reduce((sum, p) => sum + (ownHeights[p.id] ?? 166), 0),
                  left: 0,
                  right: 0,
                  minHeight: 150,
                  padding: 20,
                  gap: 10,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                }}
              >
                <Label bold>Bạn · Vừa xong</Label>
                <Label>{post.text}</Label>
                {ui.state.published[post.id] ? (
                  <>
                    <Label size={12} color="#6E7D8A">
                      {[
                        ui.state.published[post.id]!.audience,
                        ui.state.published[post.id]!.location,
                        ui.state.published[post.id]!.feeling,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Label>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {ui.state.published[post.id]!.media.map((m) => (
                        <View key={m.id} style={{ flex: 1, overflow: 'hidden', borderRadius: 12 }}>
                          <Artwork
                            source={m.source}
                            width={ui.state.published[post.id]!.media.length === 1 ? 388 : 190}
                            height={170}
                            fit="cover"
                          />
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}
              </View>
            ))}
            {!ui.state.hidden.includes('healing') ? (
              <>
                <Hit
                  label="Trang thành viên Healing"
                  box={[20, 329 + ownOffset, 230, 59]}
                  onPress={() => member('healing')}
                />
                <Hit
                  label="Mở bài đăng Healing"
                  box={[22, 397 + ownOffset, 382, 211]}
                  onPress={() => openPost('healing')}
                />
                <Hit
                  label="Tùy chọn bài đăng Healing"
                  box={[358, 318 + ownOffset, 51, 51]}
                  onPress={() => go('options', { postId: 'healing' })}
                />
                <Hit
                  label={
                    ui.state.liked.includes('healing') ? 'Bỏ thích bài đăng' : 'Thích bài đăng'
                  }
                  box={[23, 615 + ownOffset, 86, 48]}
                  onPress={() => ui.toggleLike('healing')}
                />
                <Hit
                  label="Xem thảo luận"
                  box={[113, 615 + ownOffset, 150, 48]}
                  onPress={() => go('post', { postId: 'healing' })}
                />
                <Hit
                  label="Chia sẻ bài đăng"
                  box={[263, 615 + ownOffset, 68, 48]}
                  onPress={() =>
                    router.push({
                      pathname: '/messages',
                      params: { view: 'share', postId: 'healing' },
                    })
                  }
                />
                <Hit
                  label={
                    ui.state.saved.includes('healing')
                      ? 'Bỏ lưu bài đăng Healing'
                      : 'Lưu bài đăng Healing'
                  }
                  box={[346, 615 + ownOffset, 62, 48]}
                  onPress={() => ui.toggleSave('healing')}
                />
              </>
            ) : null}
            {!ui.state.hidden.includes('save') ? (
              <Hit
                label="Mở bài đăng Save"
                box={[19, (ui.state.hidden.includes('healing') ? 320 : 686) + ownOffset, 389, 125]}
                onPress={() => openPost('save')}
              />
            ) : null}
          </>
        ) : null}
        {explore ? (
          <>
            <TextInput
              accessibilityLabel="Tìm kiếm cộng đồng"
              value={query}
              placeholder="Tìm kiếm cộng đồng"
              onChangeText={setQuery}
              returnKeyType="search"
              style={{
                position: 'absolute',
                left: 73,
                top: 157,
                width: 279,
                height: 30,
                padding: 0,
                fontFamily: 'BackupInter_400Regular',
                fontSize: 14,
                color: '#0B2E4F',
              }}
            />
            <Hit label="Xóa từ khóa" box={[362, 147, 36, 49]} onPress={() => setQuery('')} />
            {(['explore', 'members', 'topics'] as const).map((v, i) => (
              <Hit
                key={v}
                role="tab"
                label={['Bài viết', 'Thành viên', 'Chủ đề'][i]!}
                selected={view === v}
                box={
                  [
                    [23, 214, 110, 36],
                    [141, 214, 121, 36],
                    [270, 214, 100, 36],
                  ][i]!
                }
                onPress={() => go(v, { q: query })}
              />
            ))}
            {view === 'explore' ? (
              <>
                {postRows.map((p, i) => (
                  <Hit
                    key={p.id}
                    label={`Đọc ${p.title}`}
                    box={[23, 313 + i * 149, 382, 137]}
                    onPress={() => openPost(p.id)}
                  />
                ))}
                <Hit
                  label="Trang thành viên Healing"
                  box={[23, 668, 267, 111]}
                  onPress={() => member('healing')}
                />
                <Hit
                  label={followLabel('healing', 'Healing')}
                  box={[300, 702, 92, 35]}
                  onPress={() => ui.toggleFollow('healing')}
                />
              </>
            ) : view === 'members' ? (
              memberRows.map((m, i) => (
                <View key={m.id}>
                  <Hit
                    label={`Trang thành viên ${m.name}`}
                    box={[23, 313 + i * 130, 270, 114]}
                    onPress={() => member(m.id)}
                  />
                  <Hit
                    label={followLabel(m.id, m.name)}
                    box={[304, 350 + i * 130, 91, 35]}
                    onPress={() => ui.toggleFollow(m.id)}
                  />
                </View>
              ))
            ) : (
              topicRows.map((topic, i) => (
                <Hit
                  key={topic}
                  label={`Chủ đề ${topic}`}
                  box={[23, 313 + i * 135, 382, 119]}
                  onPress={() => go('explore', { q: topic })}
                />
              ))
            )}
            {empty ? (
              <View
                style={{
                  position: 'absolute',
                  left: 24,
                  top: 312,
                  width: 380,
                  padding: 24,
                  backgroundColor: 'white',
                  borderRadius: 18,
                }}
              >
                <Label>Không có kết quả phù hợp.</Label>
              </View>
            ) : null}
          </>
        ) : null}
        {view === 'post' ? (
          <>
            <Hit
              label="Trang thành viên tác giả"
              box={[28, 153, 302, 55]}
              onPress={() => member(postId)}
            />
            <Hit
              label="Tùy chọn bài đăng"
              box={[356, 153, 41, 42]}
              onPress={() => go('options', { postId })}
            />
            <Hit
              label={liked ? 'Bỏ thích bài đăng' : 'Thích bài đăng'}
              box={[30, 536, 119, 39]}
              onPress={() => ui.toggleLike(postId)}
            />
            <Hit label="Viết bình luận" box={[151, 536, 144, 39]} onPress={openComment} />
            <Hit
              label="Chia sẻ bài đăng"
              box={[300, 536, 101, 39]}
              onPress={() =>
                router.push({ pathname: '/messages', params: { view: 'share', postId } })
              }
            />
            <Hit label="Viết bình luận bên dưới" box={[20, 778, 387, 41]} onPress={openComment} />
          </>
        ) : null}
        {view === 'member' ? (
          <>
            <Hit
              label={followLabel(selectedMember.id, selectedMember.name)}
              box={[38, 441, 352, 38]}
              onPress={() => ui.toggleFollow(selectedMember.id)}
            />
            <Hit
              label={`Mở bài viết của ${selectedMember.name}`}
              box={[20, 550, 388, 232]}
              onPress={() => openPost(postOf(selectedMember.id))}
            />
          </>
        ) : null}
        {view === 'saved' ? (
          <>
            {(sample ? (['healing', 'save', 'linh'] as CommunityPostId[]) : ui.state.saved).map(
              (id, i, visible) => {
                const sizes: Record<CommunityPostId, number> = {
                  healing: 265,
                  save: 124,
                  linh: 104,
                };
                const y =
                  273 +
                  visible
                    .slice(0, i)
                    .reduce((sum, key) => sum + sizes[key] + (key === 'save' ? 15 : 14), 0);
                return (
                  <Hit
                    key={id}
                    label={`Mở bài đã lưu ${id === 'healing' ? 'Healing' : id === 'save' ? 'Save' : 'Linh Chi'}`}
                    box={[22, y, 384, sizes[id]]}
                    onPress={() => openPost(id)}
                  />
                );
              },
            )}
            {!sample && !ui.state.saved.length ? (
              <View style={{ position: 'absolute', left: 24, top: 273, width: 380, gap: 16 }}>
                <Label>Bạn chưa lưu bài đăng nào.</Label>
                <Button title="Khám phá bài viết" onPress={() => go('explore')} />
              </View>
            ) : null}
          </>
        ) : null}
        {view === 'comment' ? (
          <>
            <Hit label="Gửi bình luận" box={[362, 65, 52, 40]} onPress={submit} />
            <TextInput
              accessibilityLabel="Bình luận của bạn"
              value={comment}
              onChangeText={setDraft}
              multiline
              maxLength={500}
              autoFocus={!sample}
              placeholder="Viết bình luận..."
              textAlignVertical="top"
              style={{
                position: 'absolute',
                left: 35,
                top: 346,
                width: 357,
                height: 86,
                padding: 0,
                fontFamily: 'BackupInter_400Regular',
                fontSize: 14,
                lineHeight: 17,
                color: '#0B2E4F',
              }}
            />
            {error ? (
              <View
                accessibilityRole="alert"
                style={{ position: 'absolute', left: 35, top: 479, width: 357 }}
              >
                <Label color="#B42318">Nhập bình luận trước khi gửi.</Label>
              </View>
            ) : null}
            {Platform.OS === 'web' ? (
              <>
                {data['723:5646'].layers
                  .filter((l) => l.kind === 'text' && l.y >= 580 && l.y <= 714)
                  .map((l) => (
                    <Hit
                      key={l.id}
                      label={
                        l.text === '⌫'
                          ? 'Xóa ký tự'
                          : l.text === '⇧'
                            ? 'Đổi chữ hoa'
                            : `Phím ${l.text}`
                      }
                      box={[l.x, l.y - 11, l.w, 44]}
                      onPress={() =>
                        l.text === '⌫'
                          ? setDraft(Array.from(comment).slice(0, -1).join(''))
                          : l.text === '⇧'
                            ? setCaps(!caps)
                            : setDraft(comment + (caps ? l.text : l.text?.toLowerCase()))
                      }
                    />
                  ))}
                <Hit
                  label="Dấu cách"
                  box={[100, 744, 229, 44]}
                  onPress={() => setDraft(comment + ' ')}
                />
                <Hit label="Gửi từ bàn phím" box={[335, 744, 78, 44]} onPress={submit} />
              </>
            ) : null}
          </>
        ) : null}
        {view === 'options' ? (
          <>
            <Hit label="Đóng tùy chọn bài đăng" box={[0, 0, 428, 547]} onPress={back} />
            <Hit
              label={ui.state.saved.includes(postId) ? 'Bỏ lưu bài đăng' : 'Lưu bài đăng'}
              box={[20, 630, 388, 53]}
              onPress={() => {
                ui.toggleSave(postId);
                back();
              }}
            />
            <Hit label="Sao chép liên kết" box={[20, 697, 388, 53]} onPress={() => void copy()} />
            <Hit
              label="Ẩn bài đăng"
              box={[20, 764, 388, 53]}
              onPress={() => {
                ui.hidePost(postId);
                router.replace('/community');
              }}
            />
            <Hit label="Hủy tùy chọn bài đăng" box={[20, 841, 388, 53]} onPress={back} />
          </>
        ) : null}
      </DesignFrameCanvas>
      {extraSheet || feedback ? (
        <CollectionSheet
          title={feedback ? 'Chia sẻ bài đăng' : 'Bài đăng'}
          onClose={() => {
            setExtraSheet(false);
            setFeedback(null);
          }}
        >
          {feedback ? (
            <View accessibilityRole="alert">
              <Label>{feedback}</Label>
            </View>
          ) : (
            <>
              <Button title="Sao chép liên kết" onPress={() => void copy()} />
              <Button
                title="Tin nhắn"
                variant="secondary"
                onPress={() => {
                  setExtraSheet(false);
                  router.push('/messages');
                }}
              />
            </>
          )}
          <Button
            title="Đóng"
            variant="quiet"
            onPress={() => {
              setExtraSheet(false);
              setFeedback(null);
            }}
          />
        </CollectionSheet>
      ) : null}
    </>
  );
}

export function CommunityPostScreen() {
  return <CommunityDesignScreen initialView="post" />;
}
