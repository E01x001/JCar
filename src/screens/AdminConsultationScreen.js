import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import {
  subscribeToBuyConsultations,
  subscribeToSellConsultations,
  subscribeToCompletedConsultations,
} from '../services/firebaseService';
import BuyConsultationsTab from './AdminConsultation/tabs/BuyConsultationsTab';
import SellConsultationsTab from './AdminConsultation/tabs/SellConsultationsTab';
import CompletedConsultationsTab from './AdminConsultation/tabs/CompletedConsultationsTab';

const AdminConsultationScreen = () => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const navigation = useNavigation();
  const [buyConsultations, setBuyConsultations] = useState([]);
  const [sellConsultations, setSellConsultations] = useState([]);
  const [completedConsultations, setCompletedConsultations] = useState([]);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'buy', title: '구매상담' },
    { key: 'sell', title: '판매상담' },
    { key: 'completed', title: '거래완료' },
  ]);

  useEffect(() => {
    if (!user) {return () => {};}

    const unsubscribeBuy = subscribeToBuyConsultations(setBuyConsultations);
    const unsubscribeSell = subscribeToSellConsultations(setSellConsultations);
    const unsubscribeCompleted = subscribeToCompletedConsultations(setCompletedConsultations);

    return () => {
      unsubscribeBuy();
      unsubscribeSell();
      unsubscribeCompleted();
    };
  }, [user]);

  const handleNavigateToVehicleDetail = (vehicleId) => {
    navigation.navigate('AdminVehicleDetail', { vehicleId });
  };

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'buy':
        return (
          <BuyConsultationsTab
            consultations={buyConsultations}
            onNavigateToVehicle={handleNavigateToVehicleDetail}
          />
        );
      case 'sell':
        return (
          <SellConsultationsTab
            consultations={sellConsultations}
            onNavigateToVehicle={handleNavigateToVehicleDetail}
          />
        );
      case 'completed':
        return (
          <CompletedConsultationsTab
            consultations={completedConsultations}
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
