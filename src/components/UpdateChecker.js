// src/components/UpdateChecker.js
// Task 62.5: Removed unused Firebase imports and functions (feature disabled)
import React, { useEffect, useState } from 'react';
import { logger } from '../utils/logger';
import { View, Text, Modal, Button, ActivityIndicator } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

const UpdateChecker = () => {
  const [updateInfo] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Update checking is disabled - feature commented out
    setChecking(false);
  }, []);

  const handleDownloadAndInstall = async () => {
    try {

      logger.debug('[APK 다운로드 시작]');
      const { dirs } = ReactNativeBlobUtil.fs;
      const downloadPath = `${dirs.DownloadDir}/newApp.apk`;


      logger.debug('[APK 경로]', downloadPath);

      logger.debug('[APK URL]', updateInfo.apkUrl);

      const res = await ReactNativeBlobUtil.config({
        fileCache: true,
        path: downloadPath,
      }).fetch('GET', updateInfo.apkUrl);


      logger.debug('[APK 다운로드 완료]', res.path());

      // eslint-disable-next-line no-alert
      alert('다운로드 완료 - 설치를 시작합니다.');
      ReactNativeBlobUtil.android.actionViewIntent(res.path(), 'application/vnd.android.package-archive');
    } catch (error) {

      logger.error('[APK 다운로드 실패]', error);
      // eslint-disable-next-line no-alert
      alert('오류: 다운로드에 실패했습니다.');
    }
  };

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Modal visible={!!updateInfo} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000aa' }}>
        <View style={{ width: 300, padding: 20, backgroundColor: '#fff', borderRadius: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>업데이트 안내</Text>
          <Text>새 버전({updateInfo?.version})이 출시되었습니다.</Text>

          <Button title="업데이트하기" onPress={handleDownloadAndInstall} />
        </View>
      </View>
    </Modal>
  );
};

export default UpdateChecker;
