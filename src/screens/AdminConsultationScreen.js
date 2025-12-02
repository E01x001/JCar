import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import firestore, { collection, query, orderBy, onSnapshot } from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import PendingConsultationsTab from './AdminConsultation/tabs/PendingConsultationsTab';
import ApprovedConsultationsTab from './AdminConsultation/tabs/ApprovedConsultationsTab';
import RejectedConsultationsTab from './AdminConsultation/tabs/RejectedConsultationsTab';

const AdminConsultationScreen = () => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const navigation = useNavigation();
  const [consultations, setConsultations] = useState([]);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'pending', title: '대기중' },
    { key: 'approved', title: '승인됨' },
    { key: 'rejected', title: '거절됨' },
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
      case 'pending':
        return (
          <PendingConsultationsTab
            consultations={consultations.filter(c => c.status === 'pending')}
            onNavigateToVehicle={handleNavigateToVehicleDetail}
          />
        );
      case 'approved':
        return (
          <ApprovedConsultationsTab
            consultations={consultations.filter(c => c.status === 'approved')}
            onNavigateToVehicle={handleNavigateToVehicleDetail}
          />
        );
      case 'rejected':
        return (
          <RejectedConsultationsTab
            consultations={consultations.filter(c => c.status === 'rejected')}
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
      <View style={styles.container}>
        {/* Header Card */}
        <Card style={{ margin: theme.spacing.md, marginBottom: theme.spacing.sm }}>
          <Text style={[styles.title, {
            fontSize: theme.typography.fontSize.h2,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
          }]}>상담 관리</Text>
        </Card>

        {/* TabView */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          renderTabBar={renderTabBar}
          onIndexChange={setIndex}
          initialLayout={{ width: Dimensions.get('window').width }}
        />
      </View>
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
