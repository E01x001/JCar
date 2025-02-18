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
import AdminVehiclesListScreen from '../screens/AdminVehiclesListScreen'; // 관리자 페이지 추가
import AdminPageScreen from '../screens/AdminPageScreen';
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const UserTabs = () => (
  <Tab.Navigator>
    <Tab.Screen name="Vehicles" component={VehiclesListScreen} />
    <Tab.Screen name="Register" component={VehicleRegistrationScreen} />
    <Tab.Screen name="MyPage" component={MyPageScreen} />
  </Tab.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator>
    <Tab.Screen name="AdminVehicles" component={AdminVehiclesListScreen} />
    <Tab.Screen name="AdminPage" component={AdminPageScreen} />
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
      <Stack.Navigator>
        {user ? (
          role === 'admin' ? (
            <Stack.Screen name="AdminHome" component={AdminTabs} />
          ) : (
            <Stack.Screen name="" component={UserTabs} />
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
