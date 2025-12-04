import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import ConsultationCard from '../../../components/ConsultationCard';
import StateScreen from '../../../components/StateScreen';

const BuyConsultationsTab = ({ consultations, onNavigateToVehicle }) => {
  const theme = useTheme();

  if (consultations.length === 0) {
    return (
      <StateScreen
        icon="event"
        title="구매 상담이 없습니다"
        message="구매 상담 요청이 없습니다."
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      }}
    >
      {consultations.map(consultation => (
        <ConsultationCard
          key={consultation.id}
          consultation={consultation}
          onPress={() => onNavigateToVehicle(consultation.vehicleId)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({});

export default BuyConsultationsTab;
