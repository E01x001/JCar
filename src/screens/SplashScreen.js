/**
 * SplashScreen — 앱 진입/로딩 중 표시하는 브랜드 스플래시.
 * 시안: 블루 배경 + 장식 원 + J-Car 로고(화이트) + 태그라인 + 점 인디케이터.
 * AppNavigator의 로딩 상태에서도 사용된다.
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const SplashScreen = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.primary.dark }]}>
      <View style={styles.circleA} />
      <View style={styles.circleB} />

      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        tintColor="#fff"
        resizeMode="contain"
      />
      <Text style={styles.tagline}>신뢰할 수 있는 중고차 거래 플랫폼</Text>

      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circleA: { position: 'absolute', right: -60, top: 120, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)' },
  circleB: { position: 'absolute', left: -50, bottom: 160, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.05)' },
  logo: { width: 188, height: 60 },
  tagline: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 18 },
  dots: { position: 'absolute', bottom: 48, flexDirection: 'row', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 18, backgroundColor: 'rgba(255,255,255,0.9)' },
});

export default SplashScreen;
