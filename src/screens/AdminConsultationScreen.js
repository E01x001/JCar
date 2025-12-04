import React, { useEffect, useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
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

  // Statistics calculation
  const statistics = useMemo(() => {
    const allConsultations = [...buyConsultations, ...sellConsultations];
    const total = allConsultations.length;
    const pending = allConsultations.filter(c => c.status === 'pending').length;
    const approved = allConsultations.filter(c => c.status === 'approved').length;
    const rejected = allConsultations.filter(c => c.status === 'rejected').length;
    const completed = completedConsultations.length;

    return { total, pending, approved, rejected, completed };
  }, [buyConsultations, sellConsultations, completedConsultations]);

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

  const renderStatCard = (icon, label, count, color) => {
    return (
      <Card
        key={label}
        style={{
          minWidth: 120,
          marginRight: theme.spacing.sm,
          padding: theme.spacing.md,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Icon name={icon} size={32} color={color} />
          <Text
            style={{
              fontSize: theme.typography.fontSize.h2,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text.primary,
              marginTop: theme.spacing.xs,
            }}
          >
            {count}
          </Text>
          <Text
            style={{
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
              marginTop: theme.spacing.xxs,
            }}
          >
            {label}
          </Text>
        </View>
      </Card>
    );
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
      {/* Statistics Dashboard */}
      <View style={{ paddingVertical: theme.spacing.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.md }}
        >
          {renderStatCard('question-answer', '전체', statistics.total, theme.colors.primary.main)}
          {renderStatCard('hourglass-empty', '대기중', statistics.pending, theme.colors.warning.main)}
          {renderStatCard('check-circle', '승인됨', statistics.approved, theme.colors.success.main)}
          {renderStatCard('cancel', '거절됨', statistics.rejected, theme.colors.danger.main)}
          {renderStatCard('shopping-cart', '거래완료', statistics.completed, theme.colors.info.main)}
        </ScrollView>
      </View>

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
