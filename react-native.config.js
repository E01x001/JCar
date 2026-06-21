/**
 * React Native CLI config — 폰트 에셋 링크.
 * `npx react-native-asset` 실행 시 src/assets/fonts의 Pretendard ttf가
 * android/app/src/main/assets/fonts (및 iOS Info.plist)로 복사·등록됩니다.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts'],
};
