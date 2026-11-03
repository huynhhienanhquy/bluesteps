import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusSpace } from '../../design-system/DesignScreen';
import { Button, Icon, Label, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { useResource } from '../../services/queries';
import { QueryState } from './common';
import { CurvedNavigation, MediaSlot } from './DesignParts';
import { articleCoverUrl, estimatedReadingMinutes } from './article-reading';
import { PostComments } from './PostComments';

export function ArticleDiscussionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useApp();
  return <ArticleDiscussion key={`${user?.id ?? 'guest'}:${id ?? ''}`} id={id} />;
}

function ArticleDiscussion({ id }: { id?: string }) {
  const { colors, dark, status } = useApp();
  const { write, resume } = useLocalSearchParams<{ write?: string; resume?: string }>();
  const articleParams = id ? { id, resume: resume === '1' ? '1' : undefined } : undefined;
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const article = useResource<Schemas['Article']>(`/v1/articles/${id}`, false, !!id);
  const [writing, setWriting] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    if (write === '1' && status === 'authenticated') setWriting(true);
  }, [write, status]);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return (
    <Typography.Provider value="inter">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: dark ? colors.background : '#EEF8FE' }}
      >
        <StatusSpace />
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 15,
            paddingBottom: (keyboard ? 24 : 140) + insets.bottom,
            gap: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại bài viết"
              onPress={() =>
                articleParams
                  ? router.dismissTo({ pathname: '/articles/[id]', params: articleParams })
                  : router.dismissTo('/articles')
              }
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="chevron-back" size={23} color={colors.primary} />
            </Pressable>
            <Label size={23} bold heading style={{ flex: 1 }}>
              Thảo luận
            </Label>
          </View>
          {id ? (
            <QueryState query={article}>
              {article.data ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Đọc bài viết: ${article.data.title}`}
                    onPress={() =>
                      router.dismissTo({
                        pathname: '/articles/[id]',
                        params: { id, resume: articleParams?.resume },
                      })
                    }
                    style={{
                      padding: 12,
                      borderRadius: 20,
                      backgroundColor: colors.surface,
                      gap: 12,
                    }}
                  >
                    <MediaSlot
                      code={article.data.code}
                      uri={articleCoverUrl(article.data)}
                      icon="newspaper-outline"
                      style={{ height: 154, borderRadius: 12 }}
                    />
                    <View style={{ paddingHorizontal: 4, gap: 7, paddingBottom: 4 }}>
                      <Label size={15} bold style={{ lineHeight: 21 }}>
                        {article.data.title}
                      </Label>
                      <Label size={11} color={colors.muted}>
                        {article.data.topic} · Khoảng {estimatedReadingMinutes(article.data)} phút
                        đọc
                      </Label>
                    </View>
                  </Pressable>
                  <PostComments
                    id={id}
                    article
                    open={writing}
                    onOpen={() => {
                      setWriting(true);
                      scroll.current?.scrollToEnd({ animated: true });
                    }}
                    onClose={() => {
                      setWriting(false);
                      if (write) router.setParams({ write: undefined });
                    }}
                  />
                </>
              ) : null}
            </QueryState>
          ) : (
            <Button
              title="Chọn bài viết để thảo luận"
              onPress={() => router.replace('/articles')}
            />
          )}
        </ScrollView>
        {!keyboard ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <CurvedNavigation variant="news" />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Typography.Provider>
  );
}
