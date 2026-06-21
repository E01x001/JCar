import React, { useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signOut } from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import { formatPhone } from '../utils/format';
import Card from '../components/Card';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import SectionHeader from '../components/SectionHeader';
import MyVehiclesTab from './MyPage/tabs/MyVehiclesTab';
import useVehicleStore from '../stores/vehicleStore';
import useConsultationStore from '../stores/consultationStore';

const MyPageScreen = ({ navigation }) => {
  const { user, sellerName, sellerPhone } = useContext(AuthContext);
  const theme = useTheme();
  const toast = useToast();

  // Task 84: Use Zustand stores for centralized state management with caching
  const {
    vehicles,
    subscribeToUserVehicles,
    unsubscribeFromVehicles,
  } = useVehicleStore();

  // Task 84: Subscribe to real-time updates with caching
  useEffect(() => {
    if (!user) {return () => {};}

    // Subscribe to user's own vehicles (all statuses)
    subscribeToUserVehicles(user.uid);

    return () => {
      unsubscribeFromVehicles();
    };
  }, [user]);

  const handleNavigateToVehicleDetail = (vehicleId) => {
    navigation.navigate('VehicleDetail', { vehicleId });
  };

  const handleLogout = async () => {
    try {
      // Task 72: Cleanup Firestore listeners before logout to prevent permission errors
      unsubscribeFromVehicles();
      useVehicleStore.getState().reset();
      useConsultationStore.getState().reset();

      // Task 62.4: Use modular signOut
      const auth = getAuth();
      await signOut(auth);
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
              // Task #73-76: Call Cloud Function for cascade delete with soft delete
              const cascadeDelete = functions().httpsCallable('cascadeDeleteUser');
              const result = await cascadeDelete({ userId: user.uid });

              if (result.data.success) {
                const permanentDate = new Date(result.data.permanentDeleteDate);
                const dateStr = permanentDate.toLocaleDateString('ko-KR');

                toast.showSuccess(
                  '탈퇴 완료',
                  `계정이 ${dateStr}에 영구 삭제됩니다.\n복구를 원하시면 고객센터로 문의해주세요.`,
                );

                // User will be automatically logged out since account is disabled
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      {/* User Info Card */}
      <Card elevated style={styles.profileCard}>
        <Avatar name={sellerName && sellerName !== 'Unknown' ? sellerName : 'J'} size={52} />
        <View style={styles.profileInfo}>
          {sellerName && sellerName !== 'Unknown' && (
            <Text style={[styles.userName, { color: theme.colors.text.primary }]}>{sellerName}</Text>
          )}
          <Text style={[styles.userMeta, { color: theme.colors.text.secondary }]} numberOfLines={1}>
            {user?.email ?? '이메일 없음'}
          </Text>
          {sellerPhone && sellerPhone !== 'Unknown' && (
            <Text style={[styles.userMeta, { color: theme.colors.text.secondary }]}>
              {formatPhone(sellerPhone)}
            </Text>
          )}
        </View>
      </Card>

      <SectionHeader title="내 차량" style={styles.sectionHeader} />
      <View style={styles.listWrap}>
        <MyVehiclesTab vehicles={vehicles} onNavigateToVehicle={handleNavigateToVehicleDetail} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          variant="secondary"
          title="로그아웃"
          onPress={handleLogout}
          fullWidth
          style={styles.logoutButton}
        />
        <Button
          variant="danger"
          title="회원탈퇴"
          onPress={handleDeleteAccount}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 3,
  },
  userMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listWrap: {
    flex: 1,
  },
  actions: {
    padding: 16,
    paddingTop: 8,
  },
  logoutButton: {
    marginBottom: 10,
  },
});

export default MyPageScreen;
