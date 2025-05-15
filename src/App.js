import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AdminConsultationScreen from './screens/AdminConsultationScreen';
import ConsultationDetailScreen from './screens/ConsultationDetailScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="AdminConsultation" component={AdminConsultationScreen} />
        <Stack.Screen name="ConsultationDetail" component={ConsultationDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
