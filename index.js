/**
 * 앱 진입점 (Expo).
 *
 * registerRootComponent가 AppRegistry 등록을 대신하므로 app.json의 name에
 * 의존하지 않는다. GestureHandlerRootView 래핑과 백그라운드 메시지 핸들러는
 * 기존과 동일하게 유지한다.
 */
import { registerRootComponent } from 'expo';
import React from 'react';
import { setBackgroundMessageHandler, getMessaging } from './src/services/notification/firebaseNative';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import App from './src/App';
import { applyPretendard } from './src/theme/applyPretendard';

// 시안 정합: 앱 전역 폰트를 Pretendard로 (weight별 매핑)
applyPretendard();

// 백그라운드 메시지 핸들러 (앱이 백그라운드 또는 종료 상태일 때)
// FCM은 Supabase 이전 후에도 Firebase에 남긴다(하이브리드).
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  // eslint-disable-next-line no-console
  console.log('📨 백그라운드 메시지 수신:', remoteMessage);

  if (remoteMessage.data) {
    // eslint-disable-next-line no-console
    console.log('📦 메시지 데이터:', remoteMessage.data);
  }
});

const rootStyle = { flex: 1 };

const Root = () => (
  <GestureHandlerRootView style={rootStyle}>
    <App />
  </GestureHandlerRootView>
);

registerRootComponent(Root);
