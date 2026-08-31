import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView } from 'react-native-tab-view';
import { signOutUser, hasPassword } from '../services/auth/supabaseAuthService';
import { deleteUserAccount } from '../services/auth/accountService';
import { supabase } from '../lib/supabase';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/spacing';
import { useToast } from '../hooks/useToast';
import { formatPhone } from '../utils/format';
import Avatar from '../components/Avatar';
import ScreenHeader from '../components/ScreenHeader';
import BuyConsultationsTab from './MyPage/tabs/BuyConsultationsTab';
import SellConsultationsTab from './MyPage/tabs/SellConsultationsTab';
import MyVehiclesTab from './MyPage/tabs/MyVehiclesTab';
import useVehicleStore from '../stores/vehicleStore';
import useConsultationStore from '../stores/consultationStore';

const TABS = [
  { key: 'buy', title: '구매 상담' },
  { key: 'sell', title: '판매 상담' },
  { key: 'vehicles', title: '내 차량' },
];

const MyPageScreen = ({ navigation }) => {
  const { user, sellerName, sellerPhone } = useContext(AuthContext);

  // 비밀번호가 있는 계정인가 — 서버에 묻는다.
  //
  // 예전에는 `identities`에 email이 있는지로 판단했는데 틀렸다. 구글로 가입한
  // 사람이 비밀번호 재설정으로 비밀번호를 만들어도 identities는 ["google"]
  // 그대로다. 그 판정은 비밀번호가 있는 사용자에게서 변경 수단을 숨겼다.
  const [canChangePassword, setCanChangePassword] = useState(false);
  const theme = useTheme();
  const toast = useToast();

  const {
    vehicles,
    subscribeToUserVehicles,
    unsubscribeFromVehicles,
  } = useVehicleStore();

  const {
    userConsultations: consultations,
    subscribeToUserConsultations,
    unsubscribeFromConsultations,
  } = useConsultationStore();

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!user) {return () => {};}
    subscribeToUserVehicles(user.uid);
    subscribeToUserConsultations(user.uid);
    return () => {
      unsubscribeFromVehicles();
      unsubscribeFromConsultations();
    };
  }, [user]);

  // 마운트 시 한 번만 묻는다. false -> true로 바뀌는 유일한 경로는 재설정
  // 게이트이고, 거기서 빠져나올 때 네비게이터가 다시 그려지므로 이걸로 충분하다.
  useEffect(() => {
    if (!user) { return () => {}; }
    let cancelled = false;
    hasPassword()
      .then((result) => { if (!cancelled) { setCanChangePassword(result); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // 통계 카운트
  const activeConsults = consultations.filter((c) => c.consultationStatus !== 'cancelled');
  const buyCount = activeConsults.filter((c) => c.type !== 'sell').length;
  const sellCount = activeConsults.filter((c) => c.type === 'sell').length;
  const vehicleCount = vehicles.length;

  const handleNavigateToVehicleDetail = (vehicleId) => {
    navigation.navigate('VehicleDetail', { vehicleId });
  };
  const handleNavigateToConsultationDetail = (consultationId) => {
    navigation.navigate('UserConsultationDetail', { consultationId });
  };

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'buy':
        return <BuyConsultationsTab consultations={consultations} onNavigateToConsultation={handleNavigateToConsultationDetail} />;
      case 'sell':
        return <SellConsultationsTab consultations={consultations} onNavigateToConsultation={handleNavigateToConsultationDetail} />;
      case 'vehicles':
        return (
          <MyVehiclesTab
            vehicles={vehicles}
            onNavigateToVehicle={handleNavigateToVehicleDetail}
            onManagePhotos={(vehicleId) => navigation.navigate('VehiclePhotos', { vehicleId })}
          />
        );
      default:
        return null;
    }
  };

  // 시안: 좌측 정렬 세그먼트 탭 (밑줄 인디케이터)
  const renderTabBar = () => (
    <View style={[styles.segBar, { borderBottomColor: theme.colors.border.light }]}>
      {TABS.map((t, i) => {
        const active = index === i;
        return (
          <Pressable key={t.key} onPress={() => setIndex(i)} style={styles.segItem}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.semiBold,
                color: active ? theme.colors.primary.main : theme.colors.text.tertiary,
              }}
            >
              {t.title}
            </Text>
            <View
              style={[
                styles.segUnderline,
                { backgroundColor: active ? theme.colors.primary.main : 'transparent' },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );

  const handleLogout = async () => {
    try {
      unsubscribeFromVehicles();
      unsubscribeFromConsultations();
      useVehicleStore.getState().reset();
      useConsultationStore.getState().reset();
      await signOutUser();
      toast.showSuccess('로그아웃', '정상적으로 로그아웃되었습니다.');
    } catch (error) {
      reportCrashlyticsError(error);
      logCrashlyticsMessage('MyPageScreen: Logout failed');
      toast.showError('로그아웃 실패', error.message);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      '회원탈퇴',
      '정말로 회원탈퇴 하시겠습니까?\n\n· 탈퇴 즉시 등록 차량이 다른 사용자에게 숨겨집니다\n· 30일 이내 고객센터로 문의하시면 그대로 복구됩니다\n· 30일 후 이름·연락처 등 개인정보는 파기됩니다\n· 차량 거래 및 소유권 이전 기록은 관련 법령에 따라 보관됩니다',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            if (!user) {return;}
            try {
              const { permanentDeleteDate } = await deleteUserAccount(user.uid);
              const dateStr = new Date(permanentDeleteDate).toLocaleDateString('ko-KR');
              toast.showSuccess('탈퇴 완료', `${dateStr}까지 복구할 수 있습니다.\n복구를 원하시면 고객센터로 문의해주세요.`);
            } catch (error) {
              reportCrashlyticsError(error);
              logCrashlyticsMessage('MyPageScreen: Delete account failed');
              toast.showError('탈퇴 실패', error.message || '계정 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['top', 'bottom']}>
      {/* 타이틀 */}
      <ScreenHeader title="마이페이지" />

      <View style={styles.body}>
        {/* 프로필 카드 */}
        <View style={[styles.card, styles.profileCard, theme.shadows.soft, { backgroundColor: theme.colors.background.card }]}>
          <Avatar name={sellerName && sellerName !== 'Unknown' ? sellerName : 'J'} size={60} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {sellerName && sellerName !== 'Unknown' ? sellerName : '회원'}
            </Text>
            <Text style={[styles.profileMeta, { color: theme.colors.text.secondary }]} numberOfLines={1}>
              {user?.email ?? '이메일 없음'}
            </Text>
            {sellerPhone && sellerPhone !== 'Unknown' && (
              <Text style={[styles.profileMeta, { color: theme.colors.text.secondary }]}>{formatPhone(sellerPhone)}</Text>
            )}
          </View>
        </View>

        {/* 통계 카드 */}
        <View style={[styles.card, styles.statsCard, theme.shadows.soft, { backgroundColor: theme.colors.background.card }]}>
          {[
            { n: buyCount, label: '구매 상담' },
            { n: sellCount, label: '판매 상담' },
            { n: vehicleCount, label: '내 차량' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={[styles.statDivider, { backgroundColor: theme.colors.border.light }]} />}
              <View style={styles.statCol}>
                <Text style={[styles.statNum, { color: theme.colors.primary.main }]}>{s.n}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* 세그먼트 탭 + 리스트 */}
        {renderTabBar()}
        <View style={styles.tabViewWrap}>
          <TabView
            navigationState={{ index, routes: TABS }}
            renderScene={renderScene}
            renderTabBar={() => null}
            onIndexChange={setIndex}
            initialLayout={{ width: Dimensions.get('window').width }}
          />
        </View>

        {/* 액션 */}
        <View style={[styles.actions, { backgroundColor: theme.colors.background.secondary }]}>
          {/* 구글로만 가입한 계정에는 바꿀 비밀번호가 없다 — 항목 자체를 숨긴다 */}
          {canChangePassword && (
            <Pressable
              onPress={() => navigation.navigate('ChangePassword')}
              style={({ pressed }) => [
                styles.linkBtn,
                { backgroundColor: pressed ? theme.colors.background.secondary : 'transparent' },
              ]}
              hitSlop={8}
            >
              <Text style={[styles.linkText, { color: theme.colors.text.secondary }]}>비밀번호 변경</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutBtn,
              { borderColor: theme.colors.border.subtle, backgroundColor: pressed ? theme.colors.background.secondary : 'transparent' },
            ]}
          >
            <Text style={[styles.logoutText, { color: theme.colors.text.secondary }]}>로그아웃</Text>
          </Pressable>
          <Pressable onPress={handleDeleteAccount} style={styles.withdrawBtn} hitSlop={8}>
            <Text style={[styles.withdrawText, { color: theme.colors.text.tertiary }]}>회원탈퇴</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },
  card: {
    marginHorizontal: 22,
    borderRadius: 18,
    padding: 20,
  },
  profileCard: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 18, fontWeight: '800' },
  profileMeta: { fontSize: 13, marginTop: 3 },
  statsCard: {
    marginTop: 14,
    flexDirection: 'row',
    paddingVertical: 18,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 3 },
  statDivider: { width: 1, alignSelf: 'stretch', marginVertical: 2 },
  segBar: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: spacing.screenX,
    paddingTop: 18,
    marginTop: 14,
    borderBottomWidth: 1,
  },
  segItem: { alignItems: 'center' },
  segUnderline: {
    height: 2,
    alignSelf: 'stretch',
    marginTop: 12,
    borderRadius: 2,
  },
  tabViewWrap: { flex: 1 },
  actions: { paddingHorizontal: spacing.screenX, paddingTop: 12, paddingBottom: 6 },
  logoutBtn: {
    borderWidth: 1.5,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
  linkBtn: { alignItems: 'center', paddingVertical: 12, marginBottom: 4 },
  linkText: { fontSize: 14, fontWeight: '600' },
  withdrawBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  withdrawText: { fontSize: 13 },
});

export default MyPageScreen;
