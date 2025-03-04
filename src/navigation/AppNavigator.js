import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VehiclesListScreen from '../screens/VehiclesListScreen';
import VehicleRegistrationScreen from '../screens/VehicleRegistrationScreen';
import MyPageScreen from '../screens/MyPageScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import ConsultationRequestScreen from '../screens/ConsultationRequestScreen'; // ✅ 구매 상담 신청 화면 추가

import AdminVehiclesListScreen from '../screens/AdminVehiclesListScreen';
import AdminPageScreen from '../screens/AdminPageScreen';
import AdminVehicleDetailScreen from '../screens/AdminVehicleDetailScreen';
import AdminConsultationScreen from '../screens/AdminConsultationScreen'; // ✅ 관리자 상담 관리 화면 추가

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// 사용자 탭 네비게이션 (Stack 사용)
const UserTabs = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="UserTabsMain" component={UserBottomTabs} />
    <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
    <Stack.Screen name="ConsultationRequest" component={ConsultationRequestScreen} /> {/* ✅ 구매 상담 신청 화면 추가 */}
  </Stack.Navigator>
);

// 사용자 바텀 탭 네비게이션
const UserBottomTabs = () => (
  <Tab.Navigator>
    <Tab.Screen name="Vehicles" component={VehiclesListScreen} />
    <Tab.Screen name="Register" component={VehicleRegistrationScreen} />
    <Tab.Screen name="MyPage" component={MyPageScreen} />
  </Tab.Navigator>
);

// 관리자 탭 네비게이션
const AdminTabs = () => (
  <Tab.Navigator>
    <Tab.Screen name="AdminVehicles" component={AdminVehiclesListScreen} />
    <Tab.Screen name="AdminPage" component={AdminPageScreen} />
    <Tab.Screen name="Consultations" component={AdminConsultationScreen} /> {/* ✅ 관리자 상담 관리 화면 추가 */}
  </Tab.Navigator>
);

const AppNavigator = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
        setRole(userDoc.exists ? userDoc.data().role : 'user');
        setUser(currentUser);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        {user ? (
          role === 'admin' ? (
            <>
              <Stack.Screen name="AdminHome" component={AdminTabs} />
              <Stack.Screen name="AdminVehicleDetail" component={AdminVehicleDetailScreen} />
            </>
          ) : (
            <Stack.Screen name="Home" component={UserTabs} />
          )
        ) : (
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
