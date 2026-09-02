import React, { useContext, useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen, { ONBOARDED_KEY } from '../screens/OnboardingScreen';
import ProfileCompletionScreen from '../screens/ProfileCompletionScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen'; // 잊어버린 비밀번호 화면 추가
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import { getResetToken } from '../lib/resetLink';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import VehiclesListScreen from '../screens/VehiclesListScreen';
import VehicleBrowseScreen from '../screens/VehicleBrowseScreen';
import VehicleRegistrationScreen from '../screens/VehicleRegistrationScreen';
import UserConsultationsScreen from '../screens/UserConsultationsScreen';
import MyPageScreen from '../screens/MyPageScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import ConsultationRequestScreen from '../screens/ConsultationRequestScreen';
import MyVehiclesScreen from '../screens/MyVehiclesScreen'; // ✅ 추가
import UserConsultationDetailScreen from '../screens/UserConsultationDetailScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';

import AdminVehiclesListScreen from '../screens/AdminVehiclesListScreen';
import AdminPageScreen from '../screens/AdminPageScreen';
import AdminVehicleDetailScreen from '../screens/AdminVehicleDetailScreen';
import AdminConsultationScreen from '../screens/AdminConsultationScreen';
import AdminScheduleScreen from '../screens/AdminScheduleScreen';
import AdminUserManagementScreen from '../screens/AdminUserManagementScreen';
import AdminOwnedVehicleDetailScreen from '../screens/AdminOwnedVehicleDetailScreen';
import AdminOwnershipHistoryScreen from '../screens/AdminOwnershipHistoryScreen';
import VehiclePhotosScreen from '../screens/VehiclePhotosScreen';

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
        else if (route.name === 'VehicleBrowse') {iconName = 'directions-car';}
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
    <Tab.Screen name="VehicleBrowse" component={VehicleBrowseScreen} options={{ title: '차량' }} />
    <Tab.Screen name="Register" component={VehicleRegistrationScreen} options={{ title: '등록' }} />
    <Tab.Screen name="Consultations" component={UserConsultationsScreen} options={{ title: '상담' }} />
    <Tab.Screen name="MyPage" component={MyPageScreen} options={{ title: '마이' }} />
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
    <Tab.Screen
      name="AdminVehicles"
      component={AdminVehiclesListScreen}
      options={{ title: '차량 관리', headerShown: false }}
    />
    {/* headerShown: false — 화면이 AdminHeader를 직접 그린다.
        내비 헤더를 같이 두면 제목이 두 줄로 겹친다(상담 신청 화면에서 겪은 것과 같은 문제).
        title은 탭바 라벨로 여전히 쓰인다. */}
    <Tab.Screen
      name="Consultations"
      component={AdminConsultationScreen}
      options={{ title: '상담 관리', headerShown: false }}
    />
    <Tab.Screen
      name="AdminSchedule"
      component={AdminScheduleScreen}
      options={{ title: '일정', headerShown: false }}
    />
    <Tab.Screen
      name="UserManagement"
      component={AdminUserManagementScreen}
      options={{ title: '사용자 관리', headerShown: false }}
    />
    <Tab.Screen name="AdminPage" component={AdminPageScreen} options={{ title: '관리자' }} />
  </Tab.Navigator>
);

const AppNavigator = ({ navigationRef }) => {
  const { user, role, profileCompleted, loading } = useContext(AuthContext);
  const [onboarded, setOnboarded] = useState(null); // null=확인 중
  // URL에서 한 번만 읽는다. 화면을 떠날 때 null로 만들어 폼이 되살아나지 않게 한다.
  const [resetToken, setResetToken] = useState(getResetToken);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((v) => setOnboarded(v === 'true'))
      .catch(() => setOnboarded(true)); // 읽기 실패 시 온보딩 건너뜀
  }, []);

  // 인증 확인/온보딩 확인 중에는 브랜드 스플래시
  if (loading || onboarded === null) {
    return <SplashScreen />;
  }

  // 비로그인 + 미온보딩이면 온보딩부터, 아니면 로그인부터
  const initialRouteName = user ? undefined : (onboarded ? 'Login' : 'Onboarding');

  // 재설정 링크로 들어왔다면 그 화면만 띄운다.
  //
  // 예전에는 "복구 세션인가"를 판단해 가두는 게이트였다. 지금은 세션이 아니라
  // **URL이 토큰을 들고 왔는가**만 본다 — 이 화면은 로그인된 화면이 아니고,
  // 띄운다고 해서 아무 권한도 생기지 않는다. 그래서 user 여부와 무관하다.
  if (resetToken) {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="ResetPassword">
            {() => (
              <ResetPasswordScreen
                tokenHash={resetToken}
                onLeave={() => setResetToken(null)}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // 로그인했지만 이름·전화가 없으면 완성 화면으로 강제한다.
  // 관리자는 대시보드에서 생성되는 경우가 있어 예외를 두지 않는다(연락처는 동일하게 필요).
  if (user && !profileCompleted) {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          ...navigationStyles.header,
        }}
      >
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
              name="NotificationCenter"
              component={NotificationCenterScreen}
              options={{ headerShown: true, title: '알림' }}
            />
            <Stack.Screen
              name="AdminOwnershipHistory"
              component={AdminOwnershipHistoryScreen}
              options={{ headerShown: true, title: '소유권 이전 기록' }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: true, title: '비밀번호 변경' }}
            />
          </>
        )}
        {user && role !== 'admin' && (
          <>
            <Stack.Screen name="Home" component={UserTabs} />
            <Stack.Screen
              name="VehicleDetail"
              component={VehicleDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ConsultationRequest"
              component={ConsultationRequestScreen}
              options={{ headerShown: true, title: '상담 신청' }}
            />
            <Stack.Screen
              name="VehiclePhotos"
              component={VehiclePhotosScreen}
              options={{ headerShown: true, title: '차량 사진' }}
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
            <Stack.Screen
              name="NotificationCenter"
              component={NotificationCenterScreen}
              options={{ headerShown: true, title: '알림' }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: true, title: '비밀번호 변경' }}
            />
          </>
        )}
        {!user && (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
