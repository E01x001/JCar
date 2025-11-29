import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import messaging from '@react-native-firebase/messaging';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './theme/ThemeProvider';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import { requestNotificationPermission } from './services/firebaseService';

const App = () => {
  // console.log('🚀 App component rendering...');

  useEffect(() => {
    // 앱 시작 시 알림 권한 요청
    const initializeNotifications = async () => {
      await requestNotificationPermission();
    };

    initializeNotifications();
  }, []);

  // 포그라운드 메시지 핸들러 (앱이 실행 중일 때)
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('📬 포그라운드 메시지 수신:', remoteMessage);

      // 알림 제목과 본문 추출
      const title = remoteMessage.notification?.title || '새 알림';
      const body = remoteMessage.notification?.body || '메시지를 확인하세요.';

      // 인앱 알림 표시
      Alert.alert(
        title,
        body,
        [
          {
            text: '확인',
            onPress: () => console.log('알림 확인됨'),
          },
        ],
        { cancelable: true }
      );

      // 데이터 처리 (필요시)
      if (remoteMessage.data) {
        console.log('📦 메시지 데이터:', remoteMessage.data);
        // 추가 처리 로직 (예: 특정 화면으로 이동)
      }
    });

    return unsubscribe;
  }, []);

  // 알림 탭 핸들러 (백그라운드/종료 상태에서 알림을 탭했을 때)
  useEffect(() => {
    // 앱이 종료 상태에서 알림을 탭해서 열렸을 때
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🚀 앱이 종료 상태에서 알림으로 열림:', remoteMessage);
          // 특정 화면으로 이동하는 로직 추가 가능
        }
      });

    // 앱이 백그라운드 상태에서 알림을 탭했을 때
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('👆 백그라운드에서 알림 탭됨:', remoteMessage);
      // 특정 화면으로 이동하는 로직 추가 가능
    });

    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
};

export default App;
