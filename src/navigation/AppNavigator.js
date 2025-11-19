import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VehiclesListScreen from '../screens/VehiclesListScreen';
import VehicleRegistrationScreen from '../screens/VehicleRegistrationScreen';
import MyPageScreen from '../screens/MyPageScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import ConsultationRequestScreen from '../screens/ConsultationRequestScreen';
import MyVehiclesScreen from '../screens/MyVehiclesScreen'; // ✅ 추가

import AdminVehiclesListScreen from '../screens/AdminVehiclesListScreen';
import AdminPageScreen from '../screens/AdminPageScreen';
import AdminVehicleDetailScreen from '../screens/AdminVehicleDetailScreen';
import AdminConsultationScreen from '../screens/AdminConsultationScreen';
import AdminScheduleScreen from '../screens/AdminScheduleScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const UserTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === 'Vehicles') iconName = 'directions-car';
        else if (route.name === 'Register') iconName = 'add-circle-outline';
        else if (route.name === 'MyPage') iconName = 'person';
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarStyle: { backgroundColor: '#2B4593' },
      tabBarLabelStyle: { color: 'black', textAlign: 'center' },
      headerTitleAlign: 'center',
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
        if (route.name === 'AdminVehicles') iconName = 'car-repair';
        else if (route.name === 'Consultations') iconName = 'question-answer';
        else if (route.name === 'AdminPage') iconName = 'admin-panel-settings';
        else if (route.name === 'AdminSchedule') iconName = 'calendar-month';
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarStyle: { backgroundColor: '#2B4593' },
      tabBarLabelStyle: { color: 'black', textAlign: 'center' },
      headerTitleAlign: 'center',
    })}
  >
    <Tab.Screen name="AdminVehicles" component={AdminVehiclesListScreen} options={{ title: '차량 관리' }} />
    <Tab.Screen name="Consultations" component={AdminConsultationScreen} options={{ title: '상담 관리' }} />
    <Tab.Screen name="AdminSchedule" component={AdminScheduleScreen} options={{ title: '일정' }} />
    <Tab.Screen name="AdminPage" component={AdminPageScreen} options={{ title: '관리자 정보' }} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, role, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user && role === 'admin' && (
          <>
            <Stack.Screen name="AdminHome" component={AdminTabs} />
            <Stack.Screen name="AdminVehicleDetail" component={AdminVehicleDetailScreen} />
          </>
        )}
        {user && role !== 'admin' && (
          <>
            <Stack.Screen name="Home" component={UserTabs} />
            <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
            <Stack.Screen name="ConsultationRequest" component={ConsultationRequestScreen} />
            <Stack.Screen name="MyVehicles" component={MyVehiclesScreen} />
          </>
        )}
        {!user && (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
