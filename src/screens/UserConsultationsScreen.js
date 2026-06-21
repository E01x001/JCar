import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import BuyConsultationsTab from './MyPage/tabs/BuyConsultationsTab';
import SellConsultationsTab from './MyPage/tabs/SellConsultationsTab';
import useConsultationStore from '../stores/consultationStore';

/**
 * UserConsultationsScreen
 *
 * 시안 5탭 구조(B안)의 "상담" 전용 탭. 기존 마이페이지에 묶여 있던 구매/판매 상담을
 * 독립 화면으로 분리. 데이터/네비 로직은 기존(useConsultationStore) 재사용.
 */
const UserConsultationsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();

  const {
    userConsultations: consultations,
    subscribeToUserConsultations,
    unsubscribeFromConsultations,
  } = useConsultationStore();

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'buy', title: '구매 상담' },
    { key: 'sell', title: '판매 상담' },
  ]);

  useEffect(() => {
    if (!user) {return () => {};}
    subscribeToUserConsultations(user.uid);
    return () => unsubscribeFromConsultations();
  }, [user]);

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
      default:
        return null;
    }
  };

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={{
        backgroundColor: theme.colors.primary.main,
        height: 3,
        borderRadius: 3,
      }}
      style={{
        backgroundColor: theme.colors.background.secondary,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.light,
      }}
      labelStyle={{
        fontSize: theme.typography.fontSize.body,
        fontWeight: theme.typography.fontWeight.bold,
        textTransform: 'none',
      }}
      pressColor="transparent"
      activeColor={theme.colors.primary.main}
      inactiveColor={theme.colors.text.tertiary}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['top', 'bottom']}>
      <View style={styles.titleBar}>
        <Text style={[styles.titleText, { color: theme.colors.text.primary }]}>상담 내역</Text>
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
  titleBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});

export default UserConsultationsScreen;
