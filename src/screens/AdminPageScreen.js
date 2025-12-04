import React, { useState, useEffect, useContext } from 'react';
import { Text, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore, { collection, query, where, onSnapshot, doc, deleteDoc, getDocs, writeBatch } from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import StateScreen from '../components/StateScreen';
import OwnedVehiclesList from '../components/OwnedVehiclesList';

const AdminPageScreen = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {return () => {};}

    const q = query(collection(firestore(), 'vehicles'), where('sellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, snapshot => {
      const vehicleList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      setVehicles(vehicleList);
    });

    return () => unsubscribe();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    // onSnapshot이 실시간으로 업데이트하므로, 약간의 딜레이 후 refreshing을 false로 설정
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      await deleteDoc(doc(firestore(), 'vehicles', vehicleId));
      setVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleId));
      toast.showSuccess('삭제 완료', '차량이 삭제되었습니다.');
    } catch (error) {
      crashlytics().recordError(error);
      crashlytics().log('AdminPageScreen: Delete vehicle failed');
      toast.showError('삭제 실패', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      toast.showSuccess('로그아웃', '정상적으로 로그아웃되었습니다.');
    } catch (error) {
      crashlytics().recordError(error);
      crashlytics().log('AdminPageScreen: Logout failed');
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
            const q = query(collection(firestore(), 'vehicles'), where('sellerId', '==', user.uid));
            const querySnapshot = await getDocs(q);

            const batch = writeBatch(firestore());
            querySnapshot.forEach(documentSnapshot => {
              batch.delete(documentSnapshot.ref);
            });
            await batch.commit();

            await user.delete();
            toast.showSuccess('탈퇴 완료', '계정이 삭제되었습니다.');
          } catch (error) {
            crashlytics().recordError(error);
            crashlytics().log('AdminPageScreen: Delete account failed');
            toast.showError('탈퇴 실패', error.message);
          }
        },
      },
    ]);
  };

  const handleTestCrash = () => {
    crashlytics().log('User triggered test crash');
    crashlytics().setAttribute('test_type', 'manual_crash');

    const testError = new Error('Test crash from AdminPage for Crashlytics verification');
    crashlytics().recordError(testError);

    toast.showInfo('테스트 완료', 'Crashlytics에 에러가 기록되었습니다. Firebase Console에서 확인하세요.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary.main]}
            tintColor={theme.colors.primary.main}
          />
        }
      >
        {/* User Info Card */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[styles.userInfo, {
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.secondary,
          }]}>이메일: {user?.email ?? '이메일 없음'}</Text>
        </Card>

        {/* Owned Vehicles Section */}
        <Text style={[styles.sectionTitle, {
          fontSize: theme.typography.fontSize.h3,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.md,
        }]}>보유 차량</Text>

        <OwnedVehiclesList
          onVehiclePress={(vehicle) => {
            navigation.navigate('AdminOwnedVehicleDetail', { vehicleId: vehicle.id });
          }}
        />

        {/* Vehicles Section */}
        <Text style={[styles.sectionTitle, {
          fontSize: theme.typography.fontSize.h3,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.md,
          marginTop: theme.spacing.xl,
        }]}>등록한 차량</Text>

        {vehicles.length === 0 ? (
          <StateScreen
            icon="directions-car"
            title="등록된 차량이 없습니다"
            message="아직 등록한 차량이 없습니다."
          />
        ) : (
          vehicles.map((item) => (
            <Card key={item.id} style={{ marginBottom: theme.spacing.sm }}>
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

        {/* Action Buttons */}
        <Button
          variant="secondary"
          title="로그아웃"
          onPress={handleLogout}
          style={{ marginTop: theme.spacing.xl }}
        />

        <Button
          variant="danger"
          title="회원탈퇴"
          onPress={handleDeleteAccount}
          style={{ marginTop: theme.spacing.md }}
        />

        {/* Dev-only Test Button */}
        {__DEV__ && (
          <Button
            variant="primary"
            title="Test Crashlytics"
            onPress={handleTestCrash}
            style={{
              marginTop: theme.spacing.lg,
              backgroundColor: theme.colors.warning.main,
            }}
          />
        )}
      </ScrollView>
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
