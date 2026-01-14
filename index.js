/**
 * @format
 */

import React from 'react';
import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import App from './src/App';
import {name as appName} from './app.json';

/**
 * Task 106.1: Enable Firestore Offline Persistence
 *
 * Configure Firestore to enable offline data persistence with unlimited cache size.
 * This allows the app to function during network outages by caching data locally.
 *
 * IMPORTANT: This must be called before any Firestore operations.
 *
 * References:
 * - https://rnfirebase.io/reference/firestore/settings
 * - https://firebase.google.com/docs/firestore/manage-data/enable-offline
 */
firestore().settings({
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});

// 백그라운드 메시지 핸들러 (앱이 백그라운드 또는 종료 상태일 때)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // eslint-disable-next-line no-console
  console.log('📨 백그라운드 메시지 수신:', remoteMessage);

  // 백그라운드에서는 시스템이 자동으로 알림을 표시하므로
  // 여기서는 데이터 처리만 수행 (필요시)
  if (remoteMessage.data) {
    // eslint-disable-next-line no-console
    console.log('📦 메시지 데이터:', remoteMessage.data);
    // 추가 처리 로직 (예: 로컬 데이터베이스 업데이트)
  }
});

const rootStyle = {flex: 1};

const Root = () => (
  <GestureHandlerRootView style={rootStyle}>
    <App />
  </GestureHandlerRootView>
);

AppRegistry.registerComponent(appName, () => Root);
