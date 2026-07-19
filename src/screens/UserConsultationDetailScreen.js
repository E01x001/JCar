/**
 * JCar Design System - UserConsultationDetailScreen
 *
 * Displays detailed information about a single consultation request
 * with conditional action buttons based on status.
 */

import React, { useEffect, useState, useContext } from 'react';
import { logger } from '../utils/logger';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { consultationRowToApp } from '../lib/mappers';
import { fetchVehicleById } from '../services/vehicle/supabaseVehicleService';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import Card from '../components/Card';
import Badge from '../components/Badge';
import StateScreen from '../components/StateScreen';
import Button from '../components/Button';
import { formatDate, formatTime } from '../utils/format';
import { cancelConsultation } from '../services/consultation/consultationService';

/**
 * UserConsultationDetailScreen Component
 *
 * @param {Object} props
 * @param {Object} props.route - React Navigation route object
 * @param {string} props.route.params.consultationId - Firestore consultation document ID
 * @param {Object} props.navigation - React Navigation navigation object
 */
const UserConsultationDetailScreen = ({ route, navigation }) => {
  const { consultationId } = route.params;
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const toast = useToast();

  const [consultation, setConsultation] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!consultationId || !user) {
      setLoading(false);
      return;
    }

    // Realtime: consultation_requests 변경 시 재조회 (RLS로 본인 상담만 조회됨)
    let disposed = false;
    let timer = null;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('consultation_requests')
          .select('*')
          .eq('id', consultationId)
          .maybeSingle();
        if (error) { throw error; }
        if (disposed) { return; }

        if (data) {
          const item = consultationRowToApp(data);

          // Verify user owns this consultation
          if (item.userId !== user.uid) {
            logger.error('UserConsultationDetailScreen: User does not own this consultation');
            setConsultation(null);
            setLoading(false);
            return;
          }

          setConsultation(item);

          // Fetch vehicle details (vehicleId = vehicles.id uuid)
          if (item.vehicleId) {
            try {
              const vehicleData = await fetchVehicleById(item.vehicleId);
              if (!disposed && vehicleData) {
                setVehicle(vehicleData);
              }
            } catch (error) {
              logger.error('UserConsultationDetailScreen: Failed to fetch vehicle', error);
              reportCrashlyticsError(error);
            }
          }
        } else {
          setConsultation(null);
        }
        setLoading(false);
      } catch (error) {
        if (disposed) { return; }
        logger.error('UserConsultationDetailScreen: Failed to fetch consultation', error);
        reportCrashlyticsError(error);
        setLoading(false);
      }
    };

    const scheduleReload = () => {
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(load, 300);
    };

    load();

    const channel = supabase
      .channel(`user-consultation-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultation_requests' }, scheduleReload)
      .subscribe();

    return () => {
      disposed = true;
      if (timer) { clearTimeout(timer); }
      supabase.removeChannel(channel);
    };
  }, [consultationId, user]);

  /**
   * Get status badge component based on consultation status
   */
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge variant="chip" status="approved" label="승인됨" />;
      case 'rejected':
        return <Badge variant="chip" status="rejected" label="거절됨" />;
      case 'completed':
        return <Badge variant="chip" status="completed" label="완료됨" />;
      case 'cancelled':
        return <Badge variant="chip" status="cancelled" label="취소됨" />;
      case 'meeting':
        return <Badge variant="chip" status="approved" label="상담중" />;
      default:
        return <Badge variant="chip" status="pending" label="대기중" />;
    }
  };

  /**
   * Get consultation type label
   */
  const getTypeLabel = (type) => {
    return type === 'sell' ? '판매 상담' : '구매 상담';
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, {
        backgroundColor: theme.colors.background.primary,
      }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text style={{
          fontSize: theme.typography.fontSize.body,
          color: theme.colors.text.secondary,
          marginTop: theme.spacing.md,
        }}>상담 정보를 불러오는 중...</Text>
      </View>
    );
  }

  // Error state - no consultation found
  if (!consultation) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
        <StateScreen
          icon="error-outline"
          title="상담 정보를 찾을 수 없습니다"
          message="상담 내역이 삭제되었거나 접근 권한이 없습니다."
          actionLabel="돌아가기"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, {
        backgroundColor: theme.colors.background.primary,
      }]}
      contentContainerStyle={{
        padding: theme.spacing.md,
      }}
    >
      {/* Status Badge Section */}
      <View style={[styles.statusSection, {
        marginBottom: theme.spacing.lg,
      }]}>
        {getStatusBadge(consultation.consultationStatus)}
      </View>

      {/* Vehicle Information Card */}
      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={[styles.sectionTitle, {
          fontSize: theme.typography.fontSize.h4,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.md,
        }]}>차량 정보</Text>

        <InfoRow
          label="차량명"
          value={vehicle?.vehicleName || consultation.vehicleName || '-'}
          theme={theme}
        />
        <InfoRow
          label="제조사"
          value={vehicle?.manufacturer || '-'}
          theme={theme}
        />
        <InfoRow
          label="연식"
          value={vehicle?.year ? `${vehicle.year}년` : '-'}
          theme={theme}
        />
      </Card>

      {/* Consultation Information Card */}
      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={[styles.sectionTitle, {
          fontSize: theme.typography.fontSize.h4,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.md,
        }]}>상담 정보</Text>

        <InfoRow
          label="상담 유형"
          value={getTypeLabel(consultation.type)}
          theme={theme}
        />
        <InfoRow
          label="신청 일시"
          value={consultation.createdAt ? formatDate(new Date(consultation.createdAt)) : '-'}
          theme={theme}
        />
        <InfoRow
          label="희망 일정"
          value={`${consultation.preferredDate || '-'} ${consultation.preferredTime || ''}`}
          theme={theme}
        />
      </Card>

      {/* Rejection Reason Card (only for rejected status) */}
      {consultation.consultationStatus === 'rejected' && consultation.rejectionReason && (
        <Card style={{
          marginBottom: theme.spacing.md,
          backgroundColor: theme.colors.status.rejected + '10',
          borderColor: theme.colors.status.rejected,
          borderWidth: 1,
        }}>
          <Text style={[styles.sectionTitle, {
            fontSize: theme.typography.fontSize.h4,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.status.rejected,
            marginBottom: theme.spacing.sm,
          }]}>거절 사유</Text>

          <Text style={{
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.primary,
            lineHeight: 22,
          }}>{consultation.rejectionReason}</Text>
        </Card>
      )}

      {/* Alternative Slots Card (only for rejected status with suggestions) */}
      {consultation.consultationStatus === 'rejected' && consultation.alternativeSlots && consultation.alternativeSlots.length > 0 && (
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text style={[styles.sectionTitle, {
            fontSize: theme.typography.fontSize.h4,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          }]}>제안된 대체 일정</Text>

          {consultation.alternativeSlots.map((slot, index) => (
            <Text
              key={index}
              style={{
                fontSize: theme.typography.fontSize.body,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.xs,
              }}
            >
              • {slot.date} {slot.time}
            </Text>
          ))}
        </Card>
      )}

      {/* Action Buttons Section */}
      {renderActionButtons()}
    </ScrollView>
  );

  /**
   * Render action buttons based on consultation status
   * - pending/approved: Show Cancel button
   * - rejected: Show Resubmit button
   * - completed/cancelled: No buttons
   */
  function renderActionButtons() {
    if (!consultation) {return null;}

    const { consultationStatus } = consultation;

    // No action buttons for completed or cancelled consultations
    if (consultationStatus === 'completed' || consultationStatus === 'cancelled') {
      return null;
    }

    return (
      <View style={{ marginBottom: theme.spacing.xl }}>
        {/* Cancel button for pending or approved consultations */}
        {(consultationStatus === 'pending' || consultationStatus === 'approved' || consultationStatus === 'meeting') && (
          <Button
            variant="secondary"
            title={cancelling ? '취소 중...' : '상담 취소'}
            onPress={handleCancelConsultation}
            style={{ marginBottom: theme.spacing.sm }}
            disabled={cancelling}
            loading={cancelling}
          />
        )}

        {/* Resubmit button for rejected consultations */}
        {consultationStatus === 'rejected' && (
          <Button
            variant="primary"
            title="다시 신청하기"
            onPress={handleResubmitConsultation}
          />
        )}
      </View>
    );
  }

  /**
   * Handle consultation cancellation
   * Shows confirmation dialog and cancels consultation if confirmed
   */
  function handleCancelConsultation() {
    Alert.alert(
      '상담 취소',
      '정말로 상담을 취소하시겠습니까?',
      [
        {
          text: '아니오',
          style: 'cancel',
        },
        {
          text: '예',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const result = await cancelConsultation(consultationId);

              if (result.success) {
                toast.showSuccess('상담 취소', '상담이 성공적으로 취소되었습니다.');
                // Navigation will happen automatically due to real-time listener
              } else {
                // Show specific error message from service
                toast.showError('취소 불가', result.error || '상담을 취소할 수 없습니다.');
              }
            } catch (error) {
              logger.error('Failed to cancel consultation:', error);
              reportCrashlyticsError(error);
              toast.showError('취소 실패', '상담 취소 중 오류가 발생했습니다.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }

  /**
   * Handle consultation resubmission
   * Navigate to ConsultationRequestScreen with resubmission params
   */
  function handleResubmitConsultation() {
    if (!consultation || !vehicle) {
      logger.error('Missing consultation or vehicle data for resubmission');
      toast.showError('오류', '상담 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    navigation.navigate('ConsultationRequest', {
      vehicle: vehicle,
      isSell: consultation.type === 'sell',
      consultationId: consultationId,
      existingDate: consultation.preferredDate,
      existingTime: consultation.preferredTime,
    });
  }
};

/**
 * InfoRow Component - Displays a label-value pair
 */
const InfoRow = ({ label, value, theme }) => (
  <View style={[styles.infoRow, {
    marginBottom: theme.spacing.sm,
  }]}>
    <Text style={[styles.infoLabel, {
      fontSize: theme.typography.fontSize.body,
      color: theme.colors.text.tertiary,
      fontWeight: theme.typography.fontWeight.medium,
    }]}>{label}</Text>
    <Text style={[styles.infoValue, {
      fontSize: theme.typography.fontSize.body,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.regular,
    }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSection: {
    alignItems: 'center',
  },
  sectionTitle: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLabel: {
    flex: 1,
  },
  infoValue: {
    flex: 2,
    textAlign: 'right',
  },
});

export default UserConsultationDetailScreen;
