import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import UpdateChecker from './components/UpdateChecker';

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <UpdateChecker /> {/* ✅ 업데이트 확인 컴포넌트 추가 */}
        <AppNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

export default App;
