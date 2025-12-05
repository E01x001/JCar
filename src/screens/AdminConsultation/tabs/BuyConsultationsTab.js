import React from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import ConsultationCard from '../../../components/ConsultationCard';
import StateScreen from '../../../components/StateScreen';

const BuyConsultationsTab = ({ consultations, onNavigateToVehicle }) => {
  const theme = useTheme();

  // Transform consultation data to ensure consultationStatus field exists
  const normalizeConsultation = (item) => {
    return {
      ...item,
      // Use consultationStatus if available, fallback to status (for backward compatibility)
      consultationStatus: item.consultationStatus || item.status || 'pending',
    };
  };

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
      {consultations.map(item => (
        <ConsultationCard
          key={item.id}
          consultation={normalizeConsultation(item)}
          onNavigateToVehicle={onNavigateToVehicle}
        />
      ))}
    </ScrollView>
  );
};

export default BuyConsultationsTab;
