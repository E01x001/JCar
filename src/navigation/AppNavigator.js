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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Centralized Navigation Style Constants
const navigationStyles = {
  header: {
    headerStyle: {
      backgroundColor: theme.colors.primary.main,
      elevation: 4,
      shadowColor: theme.colors.neutral.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    headerTintColor: theme.colors.text.white,
    headerTitleStyle: {
      fontSize: theme.typography.fontSize.h3,
      fontWeight: theme.typography.fontWeight.semiBold,
    },
    headerTitleAlign: 'center',
  },
  tabBar: {
    tabBarStyle: {
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 3,
      borderTopColor: theme.colors.primary.main,
      height: 60,
      paddingBottom: 8,
      paddingTop: 8,
      elevation: 8,
      shadowColor: theme.colors.neutral.black,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    tabBarActiveTintColor: theme.colors.primary.main,
    tabBarInactiveTintColor: theme.colors.text.tertiary,
    tabBarActiveBackgroundColor: theme.colors.primary.opacity10,
    tabBarLabelStyle: {
      fontSize: theme.typography.fontSize.bodySmall,
      fontWeight: theme.typography.fontWeight.semiBold,
    },
  },
};

const UserTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === 'Vehicles') {iconName = 'directions-car';}
        else if (route.name === 'Register') {iconName = 'add-circle-outline';}
        else if (route.name === 'MyPage') {iconName = 'person';}
        return <Icon name={iconName} size={size} color={color} />;
      },
      ...navigationStyles.header,
      ...navigationStyles.tabBar,
    })}
  >
    <Tab.Screen name="Vehicles" component={VehiclesListScreen} options={{ title: '차량 목록' }} />
    <Tab.Screen name="Register" component={VehicleRegistrationScreen} options={{ title: '차량 등록' }} />
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

const AppNavigator = () => {
  const { user, role, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
