// src/components/UpdateChecker.js
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Button, Alert, ActivityIndicator } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { getFirestore, collection, doc, getDoc } from '@react-native-firebase/firestore';
import ReactNativeBlobUtil from 'react-native-blob-util';

const UpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
  // checkForUpdate();
}, []);

  const checkForUpdate = async () => {
    try {
      // const db = getFirestore();
      // const localVersion = DeviceInfo.getVersion();
      // const versionDocRef = doc(db, 'app_settings', 'latest_version');
      // const versionDoc = await getDoc(versionDocRef);
      // const data = versionDoc.data();
      // if (data && data.version && isVersionNewer(data.version, localVersion)) {
      //   setUpdateInfo(data);
      // }
    } catch (error) {
      console.error('업데이트 확인 실패:', error);
    } finally {
      setChecking(false);
    }
  };

  const isVersionNewer = (serverVersion, localVersion) => {
    const sv = serverVersion.split('.').map(Number);
    const lv = localVersion.split('.').map(Number);
    const maxLen = Math.max(sv.length, lv.length);

    for (let i = 0; i < maxLen; i++) {
      const s = sv[i] ?? 0;
      const l = lv[i] ?? 0;
      if (s > l) {return true;}
      if (s < l) {return false;}
    }
    return false;
  };

  const handleDownloadAndInstall = async () => {
    try {
      console.log('[APK 다운로드 시작]');
      const { dirs } = ReactNativeBlobUtil.fs;
      const downloadPath = `${dirs.DownloadDir}/newApp.apk`;

      console.log('[APK 경로]', downloadPath);
      console.log('[APK URL]', updateInfo.apkUrl);

      const res = await ReactNativeBlobUtil.config({
        fileCache: true,
        path: downloadPath,
      }).fetch('GET', updateInfo.apkUrl);

      console.log('[APK 다운로드 완료]', res.path());

      Alert.alert('다운로드 완료', '설치를 시작합니다.');
      ReactNativeBlobUtil.android.actionViewIntent(res.path(), 'application/vnd.android.package-archive');
    } catch (error) {
      console.error('[APK 다운로드 실패]', error);
      Alert.alert('오류', '다운로드에 실패했습니다.');
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
