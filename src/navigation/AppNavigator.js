import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen'; // 잊어버린 비밀번호 화면 추가
import VehiclesListScreen from '../screens/VehiclesListScreen';
import VehicleRegistrationScreen from '../screens/VehicleRegistrationScreen';
import UserConsultationsScreen from '../screens/UserConsultationsScreen';
import MyPageScreen from '../screens/MyPageScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import ConsultationRequestScreen from '../screens/ConsultationRequestScreen';
import MyVehiclesScreen from '../screens/MyVehiclesScreen'; // ✅ 추가
import UserConsultationDetailScreen from '../screens/UserConsultationDetailScreen';

import AdminVehiclesListScreen from '../screens/AdminVehiclesListScreen';
import AdminPageScreen from '../screens/AdminPageScreen';
import AdminVehicleDetailScreen from '../screens/AdminVehicleDetailScreen';
import AdminConsultationScreen from '../screens/AdminConsultationScreen';
import AdminScheduleScreen from '../screens/AdminScheduleScreen';
import AdminUserManagementScreen from '../screens/AdminUserManagementScreen';
import AdminOwnedVehicleDetailScreen from '../screens/AdminOwnedVehicleDetailScreen';
import AdminOwnershipHistoryScreen from '../screens/AdminOwnershipHistoryScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Centralized Navigation Style Constants
const navigationStyles = {
  header: {
    headerStyle: {
      backgroundColor: '#fff',
      elevation: 0,
      shadowColor: '#1A2B5C',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F3F5',
    },
    headerTintColor: theme.colors.primary.main,
    headerTitleStyle: {
      fontSize: theme.typography.fontSize.h3,
      fontWeight: theme.typography.fontWeight.bold,
      color: '#212529',
    },
    headerTitleAlign: 'center',
  },
  tabBar: {
    tabBarStyle: {
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#F1F3F5',
      height: 62,
      paddingBottom: 8,
      paddingTop: 6,
      elevation: 0,
      shadowColor: '#1A2B5C',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    tabBarActiveTintColor: theme.colors.primary.main,
    tabBarInactiveTintColor: '#ADB5BD',
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
    },
  },
};

const UserTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === 'Vehicles') {iconName = 'home';}
        else if (route.name === 'Register') {iconName = 'add-circle-outline';}
        else if (route.name === 'Consultations') {iconName = 'question-answer';}
        else if (route.name === 'MyPage') {iconName = 'person';}
        return <Icon name={iconName} size={size} color={color} />;
      },
      // 시안: 탭 화면은 상단 네비 헤더 없이 화면 자체 헤더/콘텐츠 사용
      headerShown: false,
      ...navigationStyles.tabBar,
    })}
  >
    <Tab.Screen name="Vehicles" component={VehiclesListScreen} options={{ title: '홈' }} />
    <Tab.Screen name="Register" component={VehicleRegistrationScreen} options={{ title: '차량 등록' }} />
    <Tab.Screen name="Consultations" component={UserConsultationsScreen} options={{ title: '상담 내역' }} />
    <Tab.Screen name="MyPage" component={MyPageScreen} options={{ title: '내 정보' }} />
  </Tab.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === 'AdminVehicles') {iconName = 'car-repair';}
        else if (route.name === 'Consultations') {iconName = 'question-answer';}
        else if (route.name === 'AdminSchedule') {iconName = 'calendar-month';}
        else if (route.name === 'UserManagement') {iconName = 'people';}
        else if (route.name === 'AdminPage') {iconName = 'admin-panel-settings';}
        return <Icon name={iconName} size={size} color={color} />;
      },
      ...navigationStyles.header,
      ...navigationStyles.tabBar,
    })}
  >
    <Tab.Screen name="AdminVehicles" component={AdminVehiclesListScreen} options={{ title: '차량 관리' }} />
    <Tab.Screen name="Consultations" component={AdminConsultationScreen} options={{ title: '상담 관리' }} />
    <Tab.Screen name="AdminSchedule" component={AdminScheduleScreen} options={{ title: '일정' }} />
    <Tab.Screen name="UserManagement" component={AdminUserManagementScreen} options={{ title: '사용자 관리' }} />
    <Tab.Screen name="AdminPage" component={AdminPageScreen} options={{ title: '관리자' }} />
  </Tab.Navigator>
);

const AppNavigator = ({ navigationRef }) => {
  const { user, role, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{
        headerShown: false,
        ...navigationStyles.header,
      }}>
        {user && role === 'admin' && (
          <>
            <Stack.Screen name="AdminHome" component={AdminTabs} />
            <Stack.Screen
              name="AdminVehicleDetail"
              component={AdminVehicleDetailScreen}
              options={{ headerShown: true, title: '차량 상세' }}
            />
            <Stack.Screen
              name="AdminOwnedVehicleDetailScreen"
              component={AdminOwnedVehicleDetailScreen}
              options={{ headerShown: true, title: '소유 차량 상세' }}
            />
            <Stack.Screen
              name="AdminOwnershipHistory"
              component={AdminOwnershipHistoryScreen}
              options={{ headerShown: true, title: '소유권 이전 기록' }}
            />
          </>
        )}
        {user && role !== 'admin' && (
          <>
            <Stack.Screen name="Home" component={UserTabs} />
            <Stack.Screen
              name="VehicleDetail"
              component={VehicleDetailScreen}
              options={{ headerShown: true, title: '차량 상세' }}
            />
            <Stack.Screen
              name="ConsultationRequest"
              component={ConsultationRequestScreen}
              options={{ headerShown: true, title: '상담 신청' }}
            />
            <Stack.Screen
              name="MyVehicles"
              component={MyVehiclesScreen}
              options={{ headerShown: true, title: '내 차량' }}
            />
            <Stack.Screen
              name="UserConsultationDetail"
              component={UserConsultationDetailScreen}
              options={{ headerShown: true, title: '상담 상세' }}
            />
          </>
        )}
        {!user && (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
