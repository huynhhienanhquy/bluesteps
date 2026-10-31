import { Pressable, View } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { newsDesignAssets } from '../../design-system/news-design-assets';
import { articles } from '../../services/fixtures';
import { NewsDesignPage, NewsText as T } from './NewsDesignParts';

const a = newsDesignAssets['612:5286'];
const topics = [
  { id: 'Phân loại', label: 'Tái chế', symbol: '♻', background: '#E1F7ED', color: '#1B7652' },
  { id: 'Lối sống', label: 'Sống xanh', symbol: '☘', background: '#EAF6DE', color: '#44762D' },
  { id: 'Cộng đồng', label: 'Cộng đồng', symbol: '✦', background: '#E2EFFC', color: '#2F639B' },
  { id: 'Môi trường', label: 'Môi trường', symbol: '▧', background: '#FAF0DD', color: '#916923' },
];

export function NewsTopicsScreen() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const sample = preview === '1';
  const { news, setNews } = useApp();
  const [heroWidth, setHeroWidth] = useState(380);
  const count = (topic: string) => articles.filter((article) => article.tag === topic).length;
  const open = (topic: string) => router.push({ pathname: '/articles', params: { topic } });
  return (
    <NewsDesignPage
      title="Khám phá chủ đề"
      frame="612:5286"
      journal
      backTo="/articles"
      headerAction={
        !sample ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={10}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/articles'))}
          >
            <T size={12} weight="semibold" color="#167EC1">
              Quay lại
            </T>
          </Pressable>
        ) : null
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem chủ đề đại dương"
        accessibilityHint="Mở các bài thuộc chủ đề Môi trường"
        onLayout={(event) => setHeroWidth(event.nativeEvent.layout.width)}
        onPress={() => open('Môi trường')}
        style={{
          height: 200,
          marginTop: 20,
          borderRadius: 22,
          overflow: 'hidden',
          backgroundColor: '#0E5D7F',
        }}
      >
        <Artwork
          source={a.imgFrame}
          width={Math.max(0, heroWidth - 160)}
          height={200}
          fit="cover"
          style={{ position: 'absolute', left: 160, top: 0, opacity: 0.48, borderRadius: 20 }}
        />
        <T
          size={11}
          weight="bold"
          color="#C7EDF8"
          style={{ position: 'absolute', left: 20, top: 24 }}
        >
          01 / CHỦ ĐỀ NỔI BẬT
        </T>
        <T
          size={27}
          weight="bold"
          color="#FFFFFF"
          style={{ position: 'absolute', left: 20, top: 70 }}
        >
          Cứu lấy{'\n'}đại dương
        </T>
        <T
          size={12}
          weight="semibold"
          color="#FFFFFF"
          style={{ position: 'absolute', left: 20, top: 160 }}
        >
          {count('Môi trường')} bài viết →
        </T>
      </Pressable>
      <T
        accessibilityRole="header"
        size={18}
        weight="bold"
        color="#163345"
        style={{ height: 24, marginTop: 26 }}
      >
        Dành cho bạn
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
        {topics.map((topic) => {
          const following = news.followedTopics.includes(topic.id);
          return (
            <View
              key={topic.id}
              style={{
                flexBasis: '46%',
                flexGrow: 1,
                height: 154,
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: topic.background,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xem chủ đề ${topic.id}`}
                onPress={() => open(topic.id)}
                style={{ position: 'absolute', inset: 0 }}
              >
                <Artwork
                  source={a.imgBiuTng}
                  width={46}
                  style={{ position: 'absolute', left: 16, top: 16 }}
                />
                <T
                  size={23}
                  weight="bold"
                  color={topic.color}
                  style={{ position: 'absolute', left: 26, top: 22 }}
                >
                  {topic.symbol}
                </T>
                <T
                  size={15}
                  weight="bold"
                  color="#163345"
                  style={{ position: 'absolute', left: 16, top: 81 }}
                >
                  {topic.label}
                </T>
                <T
                  size={11}
                  weight="semibold"
                  color={topic.color}
                  style={{ position: 'absolute', left: 16, top: 119 }}
                >
                  {count(topic.id)} bài viết →
                </T>
              </Pressable>
              {!sample ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${following ? 'Bỏ theo dõi' : 'Theo dõi'} ${topic.id}`}
                  accessibilityState={{ selected: following }}
                  hitSlop={8}
                  style={{ position: 'absolute', right: 10, top: 20, maxWidth: 90 }}
                  onPress={() =>
                    setNews((current) => ({
                      ...current,
                      followedTopics: current.followedTopics.includes(topic.id)
                        ? current.followedTopics.filter((id) => id !== topic.id)
                        : [...current.followedTopics, topic.id],
                    }))
                  }
                >
                  <T size={10} weight="semibold" color={topic.color}>
                    {following ? 'Đang theo dõi' : '+ Theo dõi'}
                  </T>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
      {!sample ? (
        <View style={{ gap: 12, marginTop: 24 }}>
          <T size={12} color="#5B7385">
            Đang theo dõi {news.followedTopics.length} chủ đề trong phiên demo
          </T>
          <T size={12} color="#5B7385">
            Theo dõi chỉ lưu lựa chọn trong phiên, chưa đăng ký nhận thông báo. Số bài tính từ dữ
            liệu mẫu hiện có.
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Về tin tức"
            onPress={() => router.dismissTo('/articles')}
            hitSlop={10}
          >
            <T size={14} weight="semibold" color="#167EC1">
              Về tin tức
            </T>
          </Pressable>
        </View>
      ) : null}
    </NewsDesignPage>
  );
}
