import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Label } from '../../design-system/ui';
import { operationKey } from '../../services/api';
import { mapDocument, mapPayload, validPick, type PointMapProps } from './map-document';
export function VectorMap(props: PointMapProps) {
  if (!props.coordinate && !props.line?.length && !props.points?.length)
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <Label size={13}>Chọn vị trí hoặc điểm thu gom để xem bản đồ.</Label>
      </View>
    );
  return <MapFrame {...props} />;
}
function MapFrame(props: PointMapProps) {
  const frame = useRef<HTMLIFrameElement>(null),
    [channel] = useState(operationKey),
    [html] = useState(() => mapDocument(channel, mapPayload(props)));
  const payload = JSON.stringify(mapPayload(props));
  const { onPick, onSelectPoint } = props;
  useEffect(() => {
    const update = () =>
      frame.current?.contentWindow?.postMessage(
        { channel, type: 'update', payload: JSON.parse(payload) },
        window.location.origin,
      );
    function receive(event: MessageEvent) {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== window.location.origin ||
        event.data?.channel !== channel
      )
        return;
      if (event.data.type === 'ready') update();
      if (event.data.type === 'pick' && validPick(event.data)) onPick?.(event.data);
      if (event.data.type === 'point' && typeof event.data.id === 'string')
        onSelectPoint?.(event.data.id);
    }
    window.addEventListener('message', receive);
    update();
    return () => window.removeEventListener('message', receive);
  }, [channel, payload, onPick, onSelectPoint]);
  return (
    <iframe
      ref={frame}
      title="Bản đồ điểm thu gom"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin allow-popups"
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ border: 0, width: '100%', height: '100%', background: '#EBF0F2' }}
    />
  );
}
