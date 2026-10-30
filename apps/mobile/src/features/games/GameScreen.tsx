import { useState } from 'react';
import { Button, Card, Icon, Label, Notice, Row, Screen } from '../../design-system/ui';

const questions = [
  { title: 'Chai nhựa sạch và khô', icon: 'water-outline', answer: 'Tái chế' },
  { title: 'Vỏ rau củ', icon: 'leaf-outline', answer: 'Hữu cơ' },
  { title: 'Pin đã qua sử dụng', icon: 'battery-half-outline', answer: 'Thu gom riêng' },
];
export function GameScreen() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string>();
  const current = questions[index]!;
  return (
    <Screen title="Sứ mệnh xanh" subtitle="Luyện tập phân loại bằng cách chạm." back>
      <Notice>
        Bài luyện tập cục bộ. Không có điểm thưởng hoặc kết quả được xác minh. Game nhiều người và
        game mở rộng chưa bật.
      </Notice>
      <Card style={{ alignItems: 'center', padding: 30 }}>
        <Label size={13}>
          Câu {index + 1}/{questions.length}
        </Label>
        <Icon name={current.icon} size={80} />
        <Label size={24} bold style={{ textAlign: 'center' }}>
          {current.title}
        </Label>
      </Card>
      <Row style={{ flexWrap: 'wrap' }}>
        {['Tái chế', 'Hữu cơ', 'Thu gom riêng'].map((value) => (
          <Button
            key={value}
            title={value}
            variant="secondary"
            disabled={!!answer}
            onPress={() => setAnswer(value)}
          />
        ))}
      </Row>
      {answer ? (
        <>
          <Notice tone={answer === current.answer ? 'success' : 'warning'}>
            {answer === current.answer
              ? 'Bạn đã chọn đúng trong bài luyện tập.'
              : `Thử ghi nhớ: ${current.title} thuộc nhóm ${current.answer.toLocaleLowerCase('vi')}.`}
          </Notice>
          <Button
            title={index === questions.length - 1 ? 'Luyện tập lại' : 'Câu tiếp theo'}
            onPress={() => {
              setIndex((index + 1) % questions.length);
              setAnswer(undefined);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}
