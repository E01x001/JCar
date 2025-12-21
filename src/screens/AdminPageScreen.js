import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, deleteDoc, getDocs, writeBatch } from '@react-native-firebase/firestore';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/firebaseService'; // Task 63.2: Migrated to v22 Modular API
import { getCrashlytics, setAttribute } from '@react-native-firebase/crashlytics';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import StateScreen from '../components/StateScreen';
import OwnedVehiclesList from '../components/OwnedVehiclesList';
import { migrateConsultationStatusField } from '../scripts/migrateConsultationStatus';

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

    const db = getFirestore();
    const vehiclesRef = collection(db, 'vehicles');
    const q = query(vehiclesRef, where('sellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, snapshot => {
      const vehicleList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      setVehicles(vehicleList);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, 'vehicles', vehicleId));
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
      // Task 62.4: Use modular signOut
      const auth = getAuth();
      await signOut(auth);
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
            const db = getFirestore();
            const vehiclesRef = collection(db, 'vehicles');
            const q = query(vehiclesRef, where('sellerId', '==', user.uid));
            const querySnapshot = await getDocs(q);

            const batch = writeBatch(db);
            querySnapshot.forEach(documentSnapshot => {
              batch.delete(documentSnapshot.ref);
            });
            await batch.commit();

            await user.delete();
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

  const handleMigration = () => {
    Alert.alert(
      '데이터 마이그레이션',
      '모든 상담 요청의 status 필드를 consultationStatus로 마이그레이션합니다.\n\n⚠️ 이 작업은 한 번만 실행하면 됩니다.\n\n계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '실행',
          style: 'destructive',
          onPress: async () => {
            try {
              toast.showInfo('마이그레이션 시작', '데이터를 마이그레이션하는 중...');
              const result = await migrateConsultationStatusField();

              if (result.success) {
                Alert.alert(
                  '마이그레이션 완료',
                  `✅ 성공적으로 완료되었습니다!\n\n마이그레이션: ${result.migrated}건\n스킵: ${result.skipped}건`,
                  [{ text: '확인' }]
                );
                toast.showSuccess('완료', `${result.migrated}건 마이그레이션 완료`);
              }
            } catch (error) {
              console.error('Migration error:', error);
              reportCrashlyticsError(error);
              logCrashlyticsMessage('AdminPageScreen: Migration failed');
              Alert.alert('오류', '마이그레이션 중 오류가 발생했습니다.\n\n' + error.message);
              toast.showError('마이그레이션 실패', error.message);
            }
          },
        },
      ]
    );
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
                <Card key={item.id} style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}>
                  {item.vehicleType && (
                    <Badge
                      status="pending"
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
            <>
              {/* ⚠️ IMPORTANT: Remove or disable migration button before production release
                  Migration should only be run ONCE to convert 'status' field to 'consultationStatus'
                  After migration is complete, this button should be removed */}
              {true && ( // Set to true if you need to run migration
                <Button
                  variant="primary"
                  title="DB 마이그레이션 (status → consultationStatus)"
                  onPress={handleMigration}
                  style={{
                    marginTop: theme.spacing.sm,
                    backgroundColor: theme.colors.info.main,
                  }}
                />
              )}
              <Button
                variant="primary"
                title="Test Crashlytics"
                onPress={handleTestCrash}
                style={{
                  marginTop: theme.spacing.sm,
                  backgroundColor: theme.colors.warning.main,
                }}
              />
            </>
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
