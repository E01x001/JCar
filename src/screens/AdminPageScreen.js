import React, { useState, useEffect, useContext } from 'react';
import { logger } from '../utils/logger';
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { signOutUser } from '../services/auth/supabaseAuthService';
import { fetchMyVehicles, subscribeVehicles, deleteVehicle } from '../services/vehicle/supabaseVehicleService';
import { deleteUserAccount } from '../services/auth/accountService';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { getCrashlytics, setAttribute } from '../services/notification/firebaseNative';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import Card from '../components/Card';
import Tag from '../components/Tag';
import Button from '../components/Button';
import StateScreen from '../components/StateScreen';
import OwnedVehiclesList from '../components/OwnedVehiclesList';
import useVehicleStore from '../stores/vehicleStore';
import useConsultationStore from '../stores/consultationStore';

const AdminPageScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'owned', title: '소유 차량' },
    { key: 'registered', title: '등록한 차량' },
  ]);

  useEffect(() => {
    if (!user) {return () => {};}

    const unsubscribe = subscribeVehicles(
      () => fetchMyVehicles(user.uid),
      setVehicles,
      { channelKey: 'admin-my-vehicles' }
    );

    return () => unsubscribe();
  }, [user]);

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      await deleteVehicle(vehicleId);
      setVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleId));
      toast.showSuccess('삭제 완료', '차량이 삭제되었습니다.');
    } catch (error) {
      reportCrashlyticsError(error);
      logCrashlyticsMessage('AdminPageScreen: Delete vehicle failed');
      toast.showError('삭제 실패', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      // Task 72: Cleanup Firestore listeners before logout to prevent permission errors
      useVehicleStore.getState().unsubscribeFromVehicles();
      useVehicleStore.getState().reset();
      useConsultationStore.getState().unsubscribeFromConsultations();
      useConsultationStore.getState().reset();

      await signOutUser();
      toast.showSuccess('로그아웃', '정상적으로 로그아웃되었습니다.');
    } catch (error) {
      reportCrashlyticsError(error);
      logCrashlyticsMessage('AdminPageScreen: Logout failed');
      toast.showError('로그아웃 실패', error.message);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert('회원탈퇴', '정말로 회원탈퇴 하시겠습니까? 계정이 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴', style: 'destructive', onPress: async () => {
          if (!user) {return;}
          try {
            // 30일 유예 소프트삭제 — 차량·거래 기록은 보존되고 개인정보만 나중에 익명화된다
            await deleteUserAccount(user.uid);
            toast.showSuccess('탈퇴 완료', '계정이 삭제되었습니다.');
          } catch (error) {
            reportCrashlyticsError(error);
            logCrashlyticsMessage('AdminPageScreen: Delete account failed');
            toast.showError('탈퇴 실패', error.message);
          }
        },
      },
    ]);
  };

  const handleTestCrash = () => {
    logCrashlyticsMessage('User triggered test crash');
    const crashlyticsInstance = getCrashlytics();
    setAttribute(crashlyticsInstance, 'test_type', 'manual_crash');

    const testError = new Error('Test crash from AdminPage for Crashlytics verification');
    reportCrashlyticsError(testError);

    toast.showInfo('테스트 완료', 'Crashlytics에 에러가 기록되었습니다. Firebase Console에서 확인하세요.');
  };

  const handleOwnedVehiclePress = (vehicleId) => {
    navigation.navigate('AdminOwnedVehicleDetailScreen', { vehicleId });
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    // Since we're using onSnapshot, the data will automatically update
    // Just simulate a refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'owned':
        return (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary.main]}
                tintColor={theme.colors.primary.main}
              />
            }
          >
            <OwnedVehiclesList onVehiclePress={handleOwnedVehiclePress} />
          </ScrollView>
        );
      case 'registered':
        return (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary.main]}
                tintColor={theme.colors.primary.main}
              />
            }
          >
            {vehicles.length === 0 ? (
              <StateScreen
                icon="directions-car"
                title="등록된 차량이 없습니다"
                message="아직 등록한 차량이 없습니다."
              />
            ) : (
              vehicles.map((item) => (
                <Card elevated key={item.id} style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}>
                  {item.vehicleType && (
                    <Tag
                      variant="info"
                      label={item.vehicleType}
                      style={{ marginBottom: theme.spacing.xs }}
                    />
                  )}
                  <Text style={[styles.vehicleName, {
                    fontSize: theme.typography.fontSize.body,
                    fontWeight: theme.typography.fontWeight.semiBold,
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.xs,
                  }]}>모델: {item.model}</Text>
                  <Text style={{
                    fontSize: theme.typography.fontSize.body,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.sm,
                  }}>가격: {item.price}</Text>
                  <Button
                    variant="danger"
                    title="삭제"
                    onPress={() => handleDeleteVehicle(item.id)}
                  />
                </Card>
              ))
            )}
          </ScrollView>
        );
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      <View style={{ flex: 1 }}>
        {/* User Info Card */}
        <Card style={{ marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }}>
          <Text style={[styles.userInfo, {
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.secondary,
          }]}>이메일: {user?.email ?? '이메일 없음'}</Text>
        </Card>

        {/* TabView for Vehicles */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          renderTabBar={renderTabBar}
          onIndexChange={setIndex}
          initialLayout={{ width: Dimensions.get('window').width }}
          style={{ flex: 1 }}
        />

        {/* Action Buttons */}
        <View style={{ padding: theme.spacing.md }}>
          <Button
            variant="primary"
            title="소유권 이전 기록"
            onPress={() => navigation.navigate('AdminOwnershipHistory')}
            style={{ marginBottom: theme.spacing.sm }}
            icon={<MaterialIcons name="history" size={20} color="#fff" style={{ marginRight: 8 }} />}
          />

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

          {/* Dev-only Test Buttons */}
          {__DEV__ && (
            <Button
              variant="primary"
              title="Test Crashlytics"
              onPress={handleTestCrash}
              style={{
                marginTop: theme.spacing.sm,
                backgroundColor: theme.colors.warning.main,
              }}
            />
          )}
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
  sectionTitle: {},
  vehicleName: {},
});

export default AdminPageScreen;
