import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView } from 'react-native-tab-view';
import { signOutUser } from '../services/auth/supabaseAuthService';
import functions from '@react-native-firebase/functions';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import { formatPhone } from '../utils/format';
import Avatar from '../components/Avatar';
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
        return <MyVehiclesTab vehicles={vehicles} onNavigateToVehicle={handleNavigateToVehicleDetail} />;
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
      '정말로 회원탈퇴 하시겠습니까?\n\n✓ 탈퇴 즉시 다른 사용자에게 숨김 처리\n✓ 30일 이내 복구 시 차량·상담 등 데이터 그대로 복원\n✓ 30일 후 모든 데이터 영구 삭제 (복구 불가)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            if (!user) {return;}
            try {
              const cascadeDelete = functions().httpsCallable('cascadeDeleteUser');
              const result = await cascadeDelete({ userId: user.uid });
              if (result.data.success) {
                const permanentDate = new Date(result.data.permanentDeleteDate);
                const dateStr = permanentDate.toLocaleDateString('ko-KR');
                toast.showSuccess('탈퇴 완료', `계정이 ${dateStr}에 영구 삭제됩니다.\n복구를 원하시면 고객센터로 문의해주세요.`);
              } else {
                toast.showError('탈퇴 실패', result.data.message || '알 수 없는 오류가 발생했습니다.');
              }
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
      <View style={[styles.titleBar, { backgroundColor: theme.colors.background.card, borderBottomColor: theme.colors.border.light }]}>
        <Text style={[styles.titleText, { color: theme.colors.text.primary }]}>마이페이지</Text>
      </View>

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
  titleBar: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  titleText: { fontSize: 17, fontWeight: '800' },
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
    paddingHorizontal: 22,
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
  actions: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 6 },
  logoutBtn: {
    borderWidth: 1.5,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
  withdrawBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  withdrawText: { fontSize: 13 },
});

export default MyPageScreen;
