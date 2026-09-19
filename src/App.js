// Task 63.3: Migrated Messaging to v22 Modular API
// Task 71: Deep linking for FCM push notifications
import React, {useEffect, useRef} from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { logger } from './utils/logger';
import { getMessaging, onMessage, getInitialNotification, onNotificationOpenedApp } from './services/notification/firebaseNative';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { ThemeProvider } from './theme/ThemeProvider';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import { requestNotificationPermission } from './services/notification/fcmService';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { toastConfig } from './config/toastConfig';
import { WEB_FRAME_MAX_WIDTH } from './theme/webFrame';

/**
 * 웹에서만 앱을 가운데 480px 폰 프레임으로 감싼다. 네이티브에서는 아무것도
 * 감싸지 않고 children을 그대로 통과시킨다(불필요한 View 추가 방지).
 */
const AppFrame = ({ children }) => {
  if (Platform.OS !== 'web') { return <>{children}</>; }
  return (
    <View style={styles.webPage}>
      <View style={styles.webFrame}>{children}</View>
    </View>
  );
};

const App = () => {
  // logger.debug('🚀 App component rendering...');

  // Navigation ref for deep linking
  const navigationRef = useRef(null);

  /**
   * Handle notification data and navigate to appropriate screen
   * @param {Object} data - Notification data payload
   */
  const handleNotificationNavigation = (data) => {
    if (!data || !data.screen) {
      logger.debug('⚠️ No screen data in notification');
      return;
    }

    logger.debug('🧭 Navigating to screen:', data.screen, 'with data:', data);

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
          logger.debug('✅ Navigation successful');
        } catch (error) {
          logger.error('❌ Navigation failed:', error);
        }
      } else {
        logger.error('❌ Navigation ref not ready');
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
      logger.debug('📬 포그라운드 메시지 수신:', remoteMessage);

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
        logger.debug('📦 메시지 데이터:', remoteMessage.data);
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
          logger.debug('🚀 앱이 종료 상태에서 알림으로 열림:', remoteMessage);

          // Deep linking - 알림 데이터로 화면 이동
          if (remoteMessage.data) {
            handleNotificationNavigation(remoteMessage.data);
          }
        }
      })
      .catch(error => {
        logger.error('❌ getInitialNotification 오류:', error);
      });

    // 앱이 백그라운드 상태에서 알림을 탭했을 때
    const unsubscribe = onNotificationOpenedApp(messagingInstance, remoteMessage => {
      logger.debug('👆 백그라운드에서 알림 탭됨:', remoteMessage);

      // Deep linking - 알림 데이터로 화면 이동
      if (remoteMessage.data) {
        handleNotificationNavigation(remoteMessage.data);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <>
      {/*
        KeyboardProvider — 키보드 높이·애니메이션을 네이티브에서 실시간으로
        받아온다. 이게 있어야 KeyboardAwareScrollView가 동작한다.

        직접 만들었던 방식(adjustResize + ScrollView + 레이아웃 전환)은 키보드가
        "떴다/안 떴다" 두 상태만 알 수 있어서, 얼마나 밀어야 하는지를 추측해야
        했고 세 번 고쳐도 안 맞았다. 이건 실제 높이를 프레임 단위로 받는다.
      */}
      <KeyboardProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <LoadingProvider>
              <AuthProvider>
                {/*
                  웹 폰 프레임 — 폰 우선 앱을 데스크톱 넓은 화면에서 전체 폭으로
                  퍼뜨리지 않고, 가운데 480px 컬럼(폰 폭)으로 모은다. 콘텐츠·헤더·
                  탭바가 모두 이 프레임 안에 들어와 일관되게 정렬된다.
                  네이티브/모바일 웹(<480)에는 무영향 — 웹에서만, 화면이 넓을 때만 작동.
                */}
                <AppFrame>
                  <AppNavigator navigationRef={navigationRef} />
                  {/*
                    Toast는 프레임 "안"에 둔다. 밖에 두면 웹에서 창 전체를 기준으로
                    떠서, 480px로 모아둔 앱과 위치·폭이 어긋난다.
                  */}
                  <Toast config={toastConfig} />
                </AppFrame>
              </AuthProvider>
            </LoadingProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </KeyboardProvider>
    </>
  );
};

const styles = StyleSheet.create({
  // 프레임 바깥 페이지 — 중립 배경 위에 프레임이 떠 있는 것처럼 보이게 한다
  webPage: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E9ECF1',
  },
  // 폰 폭 컬럼 — 화면이 480보다 좁으면(모바일 웹) width:100%가 이겨 무영향
  webFrame: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_FRAME_MAX_WIDTH,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        // 데스크톱에서 프레임을 살짝 띄워 앱 경계를 보여준다
        boxShadow: '0 0 24px rgba(0,0,0,0.10)',
      },
      default: {},
    }),
  },
});

export default App;
