import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, orderBy, getDocs, writeBatch } from '@react-native-firebase/firestore';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/firebaseService'; // Task 63.2: Migrated to v22 Modular API
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import Card from '../components/Card';
import Button from '../components/Button';
import BuyConsultationsTab from './MyPage/tabs/BuyConsultationsTab';
import SellConsultationsTab from './MyPage/tabs/SellConsultationsTab';
import MyVehiclesTab from './MyPage/tabs/MyVehiclesTab';

const MyPageScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'buy', title: '구매 상담' },
    { key: 'sell', title: '판매 상담' },
    { key: 'vehicles', title: '내 차량' },
  ]);

  useEffect(() => {
    if (!user) {return () => {};}

    const db = getFirestore();
    const vehiclesRef = collection(db, 'vehicles');
    const vehiclesQuery = query(vehiclesRef, where('sellerId', '==', user.uid));
    const unsubscribeVehicles = onSnapshot(vehiclesQuery, snapshot => {
      if (snapshot) {
        const vehicleList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setVehicles(vehicleList);
      }
    }, error => {
      console.error('vehicle snapshot error:', error);
      reportCrashlyticsError(error);
      logCrashlyticsMessage('MyPageScreen: Vehicle snapshot error');
    });

    const consultationsRef = collection(db, 'consultation_requests');
    const consultationsQuery = query(
      consultationsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeConsultations = onSnapshot(consultationsQuery, snapshot => {
      if (snapshot) {
        const consultationList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setConsultations(consultationList);
      }
    }, error => {
      console.error('consultation snapshot error:', error);
      reportCrashlyticsError(error);
      logCrashlyticsMessage('MyPageScreen: Consultation snapshot error');
    });

    return () => {
      unsubscribeVehicles();
      unsubscribeConsultations();
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
            querySnapshot.forEach(documentSnapshot => batch.delete(documentSnapshot.ref));
            await batch.commit();

            await user.delete();
            toast.showSuccess('탈퇴 완료', '계정이 삭제되었습니다.');
          } catch (error) {
            reportCrashlyticsError(error);
            logCrashlyticsMessage('MyPageScreen: Delete account failed');
            toast.showError('탈퇴 실패', error.message);
          }
        },
      },
    ]);
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
