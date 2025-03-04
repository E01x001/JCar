import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './context/AuthContext'; // ✅ AuthProvider 추가
import AppNavigator from './navigation/AppNavigator';

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider> {/* ✅ AuthProvider로 감싸서 앱 전역에서 사용자 정보 관리 */}
        <AppNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

export default App;
