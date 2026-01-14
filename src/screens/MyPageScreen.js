import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import { getAuth, signOut } from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import Card from '../components/Card';
import Button from '../components/Button';
import BuyConsultationsTab from './MyPage/tabs/BuyConsultationsTab';
import SellConsultationsTab from './MyPage/tabs/SellConsultationsTab';
import MyVehiclesTab from './MyPage/tabs/MyVehiclesTab';
import useVehicleStore from '../stores/vehicleStore';
import useConsultationStore from '../stores/consultationStore';

const MyPageScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const toast = useToast();

  // Task 84: Use Zustand stores for centralized state management with caching
  const {
    vehicles: userVehicles,
    subscribeToUserVehicles,
    unsubscribeFromVehicles,
  } = useVehicleStore();

  const {
    userConsultations: consultations,
    subscribeToUserConsultations,
    unsubscribeFromConsultations,
  } = useConsultationStore();

  // User's vehicles (all statuses: pending, approved, rejected)
  // No additional filtering needed - already filtered by sellerId in the query
  const vehicles = userVehicles;

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'buy', title: '구매 상담' },
    { key: 'sell', title: '판매 상담' },
    { key: 'vehicles', title: '내 차량' },
  ]);

  // Task 84: Subscribe to real-time updates with caching
  useEffect(() => {
    if (!user) {return () => {};}

    // Subscribe to user's own vehicles (all statuses)
    subscribeToUserVehicles(user.uid);
    subscribeToUserConsultations(user.uid);

    return () => {
      unsubscribeFromVehicles();
      unsubscribeFromConsultations();
    };
  }, [user]);

  const handleNavigateToVehicleDetail = (vehicleId) => {
    navigation.navigate('VehicleDetail', { vehicleId });
  };

  const handleNavigateToConsultationDetail = (consultationId) => {
    navigation.navigate('UserConsultationDetail', { consultationId });
  };

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'buy':
        return (
          <BuyConsultationsTab
            consultations={consultations}
            onNavigateToConsultation={handleNavigateToConsultationDetail}
          />
        );
      case 'sell':
        return (
          <SellConsultationsTab
            consultations={consultations}
            onNavigateToConsultation={handleNavigateToConsultationDetail}
          />
        );
      case 'vehicles':
        return <MyVehiclesTab vehicles={vehicles} onNavigateToVehicle={handleNavigateToVehicleDetail} />;
      default:
        return null;
    }
  };

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: theme.colors.primary.main }}
      style={{ backgroundColor: theme.colors.background.card }}
      labelStyle={{
        fontSize: theme.typography.fontSize.body,
        fontWeight: theme.typography.fontWeight.semiBold,
      }}
      activeColor={theme.colors.primary.main}
      inactiveColor={theme.colors.text.secondary}
    />
  );

  const handleLogout = async () => {
    try {
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
      '정말로 회원탈퇴 하시겠습니까?\n\n✓ 30일 이내 복구 가능\n✓ 차량, 상담 등 모든 데이터 삭제\n✓ 30일 후 영구 삭제',
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
      <View style={styles.container}>
        {/* User Info Card */}
        <Card style={{ margin: theme.spacing.md, marginBottom: theme.spacing.sm }}>
          <Text style={[styles.userInfo, {
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.secondary,
          }]}>이메일: {user?.email ?? '이메일 없음'}</Text>
        </Card>

        {/* TabView */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          renderTabBar={renderTabBar}
          onIndexChange={setIndex}
          initialLayout={{ width: Dimensions.get('window').width }}
        />

        {/* Action Buttons */}
        <View style={{ padding: theme.spacing.md, paddingTop: 0 }}>
          <Button
            variant="secondary"
            title="로그아웃"
            onPress={handleLogout}
            style={{ marginBottom: theme.spacing.sm }}
          />

          <Button
            variant="danger"
            title="회원탈퇴"
            onPress={handleDeleteAccount}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {},
  userInfo: {},
});

export default MyPageScreen;
