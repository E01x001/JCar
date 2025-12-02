import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { formatPhone } from '../../../utils/format';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import StateScreen from '../../../components/StateScreen';

const ApprovedConsultationsTab = ({ consultations, onNavigateToVehicle }) => {
  const theme = useTheme();

  const buyConsultations = consultations.filter(c => c.type !== 'sell');
  const sellConsultations = consultations.filter(c => c.type === 'sell');

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => onNavigateToVehicle(item.vehicleId)}>
      <Card style={{ marginBottom: theme.spacing.sm }}>
        <View style={styles.header}>
          <Badge
            status="completed"
            label={item.type === 'sell' ? '판매' : '구매'}
          />
          <Text style={[styles.userName, {
            fontSize: theme.typography.fontSize.body,
            fontWeight: theme.typography.fontWeight.semiBold,
            color: theme.colors.text.primary,
          }]}>{item.userName}</Text>
        </View>

        <Text style={[styles.infoText, {
          fontSize: theme.typography.fontSize.bodySmall,
          color: theme.colors.text.secondary,
          marginTop: theme.spacing.xs,
        }]}>전화번호: {formatPhone(item.userPhone)}</Text>

        <Text style={[styles.infoText, {
          fontSize: theme.typography.fontSize.bodySmall,
          color: theme.colors.text.secondary,
        }]}>차량명: {item.vehicleName}</Text>

        <Text style={[styles.infoText, {
          fontSize: theme.typography.fontSize.bodySmall,
          color: theme.colors.text.secondary,
        }]}>상담 일정: {item.preferredDate} {item.preferredTime}</Text>
      </Card>
    </TouchableOpacity>
  );

  const renderSection = (title, data) => (
    <View>
      <Text style={[styles.sectionTitle, {
        fontSize: theme.typography.fontSize.h3,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.text.primary,
        marginVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
      }]}>{title}</Text>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.sm,
        }}
        ListEmptyComponent={
          <StateScreen
            icon="check-circle"
            title="승인된 상담이 없습니다"
            message={`${title} 요청이 없습니다.`}
          />
        }
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {renderSection('구매 상담', buyConsultations)}
      {renderSection('판매 상담', sellConsultations)}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {},
  infoText: {},
  sectionTitle: {},
});

export default ApprovedConsultationsTab;
