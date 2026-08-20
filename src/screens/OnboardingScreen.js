/**
 * OnboardingScreen — 첫 진입 1회 노출(3장). 완료 시 AsyncStorage 플래그 저장 후 로그인으로.
 * 시안: 화이트 카드 · 일러스트(블루 라운드 뱃지+아이콘) · 타이틀 · 설명 · 점 인디케이터 · 다음/건너뛰기.
 */
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/spacing';
import Button from '../components/Button';

export const ONBOARDED_KEY = '@jcar/onboarded';

const PAGES = [
  { icon: 'verified', title: '검증된 매물만 한눈에', desc: 'J-Car 에이전트가 직접 확인한\n믿을 수 있는 차량만 보여드려요' },
  { icon: 'forum', title: '가격은 상담으로 투명하게', desc: '담당 에이전트가 차량에 맞는\n최적의 가격을 안내해 드려요' },
  { icon: 'directions-car', title: '안전한 거래의 시작', desc: '차량 등록부터 상담 예약까지\n한 곳에서 간편하게' },
];

// 웹에서는 모듈 스코프의 window 폭이 실제 페이저 폭과 어긋나므로 onLayout으로 측정한다
const INITIAL_WIDTH = Dimensions.get('window').width;

const OnboardingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(INITIAL_WIDTH);
  const isLast = index === PAGES.length - 1;

  const finish = async () => {
    try { await AsyncStorage.setItem(ONBOARDED_KEY, 'true'); } catch (e) { /* 무시: 다음 실행에 재노출돼도 무방 */ }
    navigation.replace('Login');
  };

  const onNext = () => {
    if (isLast) { finish(); return; }
    // 웹은 smooth 스크롤이 scroll-snap(mandatory)과 충돌해 중간에 멈춘다 → 즉시 이동
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: Platform.OS !== 'web' });
    setIndex(index + 1);
  };

  const onScroll = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) { setIndex(i); }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background.card }]} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <Pressable onPress={finish} hitSlop={8}>
          <Text style={[styles.skip, { color: colors.text.tertiary }]}>건너뛰기</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}
      >
        {PAGES.map((p) => (
          <View key={p.title} style={[styles.page, { width }]}>
            <View style={[styles.illust, { backgroundColor: colors.tag.accent.bg }]}>
              <Icon name={p.icon} size={72} color={colors.primary.main} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>{p.title}</Text>
            <Text style={[styles.desc, { color: colors.text.secondary }]}>{p.desc}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {PAGES.map((p, i) => (
          <View
            key={p.title}
            style={[
              styles.dot,
              { backgroundColor: i === index ? colors.primary.main : colors.border.default },
              i === index && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Button variant="primary" title={isLast ? '시작하기' : '다음'} onPress={onNext} fullWidth />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: spacing.screenX, paddingTop: 8, height: 36, justifyContent: 'center' },
  skip: { fontSize: 14, fontWeight: '600' },
  pager: { flex: 1 },
  pagerContent: { alignItems: 'stretch' },
  page: { flexGrow: 1, flexShrink: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  illust: { width: 180, height: 180, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 42 },
  title: { fontSize: 23, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  desc: { fontSize: 14, lineHeight: 23, textAlign: 'center', marginTop: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 24 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotActive: { width: 20 },
  footer: { paddingHorizontal: spacing.screenX, paddingBottom: 30 },
});

export default OnboardingScreen;
