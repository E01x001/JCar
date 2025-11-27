/**
 * @format
 */

import {AppRegistry} from 'react-native';

// Firebase 초기화
import '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

import App from './src/App';
import {name as appName} from './app.json';

// console.log('📱 Registering app component:', appName);

// 백그라운드 메시지 핸들러 (앱이 백그라운드 또는 종료 상태일 때)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📨 백그라운드 메시지 수신:', remoteMessage);

  // 백그라운드에서는 시스템이 자동으로 알림을 표시하므로
  // 여기서는 데이터 처리만 수행 (필요시)
  if (remoteMessage.data) {
    console.log('📦 메시지 데이터:', remoteMessage.data);
    // 추가 처리 로직 (예: 로컬 데이터베이스 업데이트)
  }
});

AppRegistry.registerComponent(appName, () => App);
