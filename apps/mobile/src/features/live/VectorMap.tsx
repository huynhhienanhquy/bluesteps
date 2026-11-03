import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
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
  const frame = useRef<WebView<object>>(null),
    [channel] = useState(operationKey),
    [html] = useState(() => mapDocument(channel, mapPayload(props), 'webgl')),
    [ready, setReady] = useState(false);
  const payload = JSON.stringify(mapPayload(props)).replace(/</g, '\\u003c');
  function update() {
    frame.current?.injectJavaScript(
      `window.BlueStepsUpdate&&window.BlueStepsUpdate(${payload});true;`,
    );
  }
  useEffect(() => {
    frame.current?.injectJavaScript(
      `window.BlueStepsUpdate&&window.BlueStepsUpdate(${payload});true;`,
    );
  }, [payload]);
  return (
    <WebView<object>
      ref={frame}
      accessibilityLabel={ready ? 'Bản đồ điểm thu gom đã tải' : 'Bản đồ điểm thu gom đang tải'}
      source={{ html, baseUrl: 'https://bluesteps.local/' }}
      originWhitelist={['https://*', 'about:*']}
      javaScriptEnabled
      domStorageEnabled
      applicationNameForUserAgent="BlueSteps/0.1"
      style={{ flex: 1, backgroundColor: '#EBF0F2' }}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (message.channel !== channel) return;
          if (message.type === 'ready') {
            setReady(true);
            update();
          }
          if (message.type === 'pick' && validPick(message)) props.onPick?.(message);
          if (message.type === 'point' && typeof message.id === 'string')
            props.onSelectPoint?.(message.id);
        } catch {}
      }}
      onShouldStartLoadWithRequest={(request) => {
        if (request.url === 'about:blank' || request.url === 'https://bluesteps.local/')
          return true;
        if (
          request.navigationType === 'click' &&
          /^https:\/\/(www\.)?(openstreetmap\.org|openmaptiles\.org|openfreemap\.org)\//.test(
            request.url,
          )
        )
          void Linking.openURL(request.url);
        return false;
      }}
    />
  );
}
