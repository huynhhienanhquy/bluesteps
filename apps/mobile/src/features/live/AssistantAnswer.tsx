import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Label, Notice } from '../../design-system/ui';
import { ReferenceSources } from './HandbookParts';
import type { AssistantGuides } from './assistant-guides';
import { CollectionMaterialLink } from './CollectionMaterialLink';

export function AssistantAnswer({
  answer,
  showCollection,
}: {
  answer: AssistantGuides;
  showCollection?: boolean;
}) {
  return (
    <>
      {answer.incomplete ? (
        <Notice>Chưa tải được một phần hướng dẫn. Bạn có thể thử lại để xem đủ nội dung.</Notice>
      ) : null}
      {answer.items.map((item) => (
        <View key={item.id} style={{ gap: 6, marginBottom: 5 }}>
          <Label bold size={15} color="#172B3D">
            {item.name} · {item.category}
          </Label>
          {item.hazardous ? (
            <Notice tone="warning">
              Vật phẩm này cần được xử lý riêng. Xem đầy đủ lưu ý trong sổ tay trước khi thu gom.
            </Notice>
          ) : null}
          {item.steps.slice(0, 3).map((step, index) => (
            <Label key={index} size={14} color="#172B3D">
              {index + 1}. {step}
            </Label>
          ))}
          <ReferenceSources sources={item.sources} />
          {showCollection ? <CollectionMaterialLink material={item.material} /> : null}
          <Button
            title={`Mở sổ tay · ${item.name}`}
            variant="quiet"
            onPress={() => router.push({ pathname: '/handbook/[id]', params: { id: item.id } })}
          />
        </View>
      ))}
      {answer.guides.map((guide) => (
        <View key={guide.section + ':' + guide.code} style={{ gap: 7, marginBottom: 5 }}>
          <Label bold size={15} color="#172B3D">
            {guide.title}
          </Label>
          <Label size={14} color="#172B3D">
            {guide.summary}
          </Label>
          {(guide.handling ?? []).slice(0, 3).map((step, index) => (
            <Label key={index} size={14} color="#172B3D">
              {index + 1}. {step}
            </Label>
          ))}
          {guide.warning ? <Notice tone="warning">{guide.warning}</Notice> : null}
          <ReferenceSources sources={guide.sources} reviewed={guide.reviewedOn} />
          <Button
            title={`Xem hướng dẫn · ${guide.title}`}
            variant="quiet"
            onPress={() =>
              guide.section === 'category'
                ? router.push({
                    pathname: '/handbook/category/[category]',
                    params: { category: guide.code },
                  })
                : router.push({ pathname: '/handbook/types/[kind]', params: { kind: guide.code } })
            }
          />
        </View>
      ))}
      {!answer.items.length && !answer.guides.length ? (
        <>
          <Label size={14} color="#172B3D">
            Mình chưa tìm thấy hướng dẫn phù hợp. Thử nhập tên món cụ thể hoặc nhóm rác, ví dụ chai
            nhựa, pin cũ hay rác hữu cơ.
          </Label>
          <Button title="Mở sổ tay rác" variant="quiet" onPress={() => router.push('/handbook')} />
        </>
      ) : null}
    </>
  );
}
