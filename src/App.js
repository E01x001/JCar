// Task 63.3: Migrated Messaging to v22 Modular API
// Task 71: Deep linking for FCM push notifications
import React, {useEffect, useRef} from 'react';
import {Alert} from 'react-native';
import { getMessaging, onMessage, getInitialNotification, onNotificationOpenedApp } from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { ThemeProvider } from './theme/ThemeProvider';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import { requestNotificationPermission } from './services/notification/fcmService';
import { toastConfig } from './config/toastConfig';

const App = () => {
  // console.log('🚀 App component rendering...');

  // Navigation ref for deep linking
  const navigationRef = useRef(null);

  /**
   * Handle notification data and navigate to appropriate screen
   * @param {Object} data - Notification data payload
   */
  const handleNotificationNavigation = (data) => {
    if (!data || !data.screen) {
      console.log('⚠️ No screen data in notification');
      return;
    }

    console.log('🧭 Navigating to screen:', data.screen, 'with data:', data);

    // Wait for navigation to be ready
    setTimeout(() => {
      if (navigationRef.current) {
        const params = {};

        // Add consultationId if present
        if (data.consultationId) {
          params.consultationId = data.consultationId;
        }

        // Add vehicleId if present
        if (data.vehicleId) {
          params.vehicleId = data.vehicleId;
        }

        try {
          navigationRef.current.navigate(data.screen, params);
          console.log('✅ Navigation successful');
        } catch (error) {
          console.error('❌ Navigation failed:', error);
        }
      } else {
        console.error('❌ Navigation ref not ready');
      }
    }, 500); // Small delay to ensure navigation is mounted
  };

  useEffect(() => {
    // 앱 시작 시 알림 권한 요청
    const initializeNotifications = async () => {
      await requestNotificationPermission();
    };

    initializeNotifications();
  }, []);

  // 포그라운드 메시지 핸들러 (앱이 실행 중일 때)
  useEffect(() => {
    const messagingInstance = getMessaging();
    const unsubscribe = onMessage(messagingInstance, async remoteMessage => {
      console.log('📬 포그라운드 메시지 수신:', remoteMessage);

      // 알림 제목과 본문 추출
      const title = remoteMessage.notification?.title || '새 알림';
      const body = remoteMessage.notification?.body || '메시지를 확인하세요.';

      // Toast 알림 표시 (foreground에서만)
      Toast.show({
        type: 'info',
        text1: title,
        text2: body,
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 60,
        onPress: () => {
          // Toast를 탭하면 화면으로 이동
          if (remoteMessage.data) {
            handleNotificationNavigation(remoteMessage.data);
          }
          Toast.hide();
        },
      });

      // 데이터 처리 - Deep linking
      if (remoteMessage.data) {
        console.log('📦 메시지 데이터:', remoteMessage.data);
        // Note: 자동 이동은 하지 않음 (사용자가 Toast를 탭해야 이동)
        // 자동 이동을 원하면 여기서 handleNotificationNavigation(remoteMessage.data) 호출
      }
    });

    return unsubscribe;
  }, []);

  // 알림 탭 핸들러 (백그라운드/종료 상태에서 알림을 탭했을 때)
  useEffect(() => {
    const messagingInstance = getMessaging();

    // 앱이 종료 상태에서 알림을 탭해서 열렸을 때
    getInitialNotification(messagingInstance)
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🚀 앱이 종료 상태에서 알림으로 열림:', remoteMessage);

          // Deep linking - 알림 데이터로 화면 이동
          if (remoteMessage.data) {
            handleNotificationNavigation(remoteMessage.data);
          }
        }
      })
      .catch(error => {
        console.error('❌ getInitialNotification 오류:', error);
      });

    // 앱이 백그라운드 상태에서 알림을 탭했을 때
    const unsubscribe = onNotificationOpenedApp(messagingInstance, remoteMessage => {
      console.log('👆 백그라운드에서 알림 탭됨:', remoteMessage);

      // Deep linking - 알림 데이터로 화면 이동
      if (remoteMessage.data) {
        handleNotificationNavigation(remoteMessage.data);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <>
      <ErrorBoundary>
        <ThemeProvider>
          <LoadingProvider>
            <AuthProvider>
              <AppNavigator navigationRef={navigationRef} />
            </AuthProvider>
          </LoadingProvider>
        </ThemeProvider>
      </ErrorBoundary>
      <Toast config={toastConfig} />
    </>
  );
};

export default App;
