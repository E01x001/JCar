import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import firestore, { collection, query, orderBy, onSnapshot } from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import BuyConsultationsTab from './AdminConsultation/tabs/BuyConsultationsTab';
import SellConsultationsTab from './AdminConsultation/tabs/SellConsultationsTab';
import MeetingConsultationsTab from './AdminConsultation/tabs/MeetingConsultationsTab';

const AdminConsultationScreen = () => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const navigation = useNavigation();
  const [consultations, setConsultations] = useState([]);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'buy', title: '구매상담' },
    { key: 'sell', title: '판매상담' },
    { key: 'meeting', title: '미팅' },
  ]);

  useEffect(() => {
    if (!user) {return () => {};}

    const q = query(collection(firestore(), 'consultation_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setConsultations(all);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNavigateToVehicleDetail = (vehicleId) => {
    navigation.navigate('AdminVehicleDetail', { vehicleId });
  };

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'buy':
        return (
          <BuyConsultationsTab
            consultations={consultations}
            onNavigateToVehicle={handleNavigateToVehicleDetail}
          />
        );
      case 'sell':
        return (
          <SellConsultationsTab
            consultations={consultations}
            onNavigateToVehicle={handleNavigateToVehicleDetail}
          />
        );
      case 'meeting':
        return (
          <MeetingConsultationsTab
            consultations={consultations}
            onNavigateToVehicle={handleNavigateToVehicleDetail}
          />
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
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {},
});

export default AdminConsultationScreen;
