//import React, { useEffect } from 'react';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
//import fixAllCollections from './scripts/fixAllCollections';

const App = () => {
  // useEffect(() => {
  //   fixAllCollections(); // ✅ 컴포넌트 안에서 실행해야 정상 작동
  // }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

export default App;
