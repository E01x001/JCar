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
import OwnershipTransferRow from '../components/OwnershipTransferRow';
import Badge from '../components/Badge';
import StateScreen from '../components/StateScreen';
import Button from '../components/Button';
import { formatDate, formatTime } from '../utils/format';
import { TOUCH_TARGET_MIN } from '../theme/spacing';
import { cancelConsultation, acceptAlternativeSlot } from '../services/consultation/consultationService';
import {
  canUserCancel,
  shouldShowAlternativeSlots,
  canAcceptAlternativeSlot,
  getAlternativeSlots,
} from '../constants/consultation';

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
  // 수락 중인 슬롯 인덱스 — 버튼별 로딩과 중복 탭 방지를 겸한다
  const [accepting, setAccepting] = useState(null);

  /**
   * 대체 일정 수락 — 인덱스만 보낸다.
   *
   * 날짜·시간을 클라이언트가 보내지 않는 것이 핵심이다. 서버 RPC가 소유자·상태·
   * 인덱스를 검증하고 저장된 슬롯에서 값을 꺼내므로, 제안되지 않은 시간을
   * 넣을 수 없다. 화면 갱신은 이 화면의 realtime 구독이 처리한다.
   */
  const handleAcceptSlot = (index, slot) => {
    Alert.alert(
      '이 시간으로 확정할까요?',
      `${slot.date} ${slot.time}\n\n확정하면 상담 일정이 이 시간으로 변경됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확정',
          onPress: async () => {
            setAccepting(index);
            try {
              await acceptAlternativeSlot(consultation.id, index);
              toast.showSuccess('일정 확정', `${slot.date} ${slot.time}으로 확정되었습니다.`);
            } catch (error) {
              logger.error('UserConsultationDetailScreen: accept slot failed', error);
              reportCrashlyticsError(error);
              logCrashlyticsMessage('acceptAlternativeSlot failed');
              // 서버가 한국어 사유를 담아 던진다(이미 찬 시간, 상태 불일치 등) —
              // 그대로 보여주는 것이 "알 수 없는 오류"보다 낫다.
              toast.showError('확정 실패', error?.message || '일정을 확정할 수 없습니다.');
            } finally {
              setAccepting(null);
            }
          },
        },
      ],
    );
  };

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

      {/* 명의이전 진행 — 체결된 거래에만 붙는다.
          실제 이전은 관리자가 오프라인으로 처리하고, 신청자는 어디까지
          갔는지 여기서 확인한다(예전에는 관리자만 조회할 수 있어 알 방법이
          없었다). 신청자에게는 상태만 보이고 버튼은 없다. */}
      {consultation.consultationStatus === 'completed' && (
        <Card style={{ marginBottom: theme.spacing.md }}>
          <OwnershipTransferRow consultationId={consultation.id} isAdmin={false} />
        </Card>
      )}

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

      {/*
        제안된 대체 일정.

        표시 조건을 화면에서 상태 이름으로 나열하지 않는다 — 예전에 여기서
        'rejected'만 검사해, 실제로 제안이 들어오는 'on-hold' 상담에는 제안이
        한 번도 보이지 않았다. 규칙은 constants/consultation.js에만 둔다.
      */}
      {shouldShowAlternativeSlots(consultation) && (
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text style={[styles.sectionTitle, {
            fontSize: theme.typography.fontSize.h4,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xs,
          }]}>제안된 대체 일정</Text>

          <Text style={{
            fontSize: theme.typography.fontSize.bodySmall,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.sm,
          }}>
            {canAcceptAlternativeSlot(consultation)
              ? '원하는 시간을 선택하면 그 시간으로 확정됩니다.'
              : '관리자가 제안한 시간입니다.'}
          </Text>

          {getAlternativeSlots(consultation).map((slot, index) => (
            <View key={`${slot.date}T${slot.time}`} style={styles.slotRow}>
              <Text
                style={{
                  flex: 1,
                  fontSize: theme.typography.fontSize.body,
                  color: theme.colors.text.primary,
                }}
              >
                {slot.date} {slot.time}
              </Text>

              {canAcceptAlternativeSlot(consultation) && (
                <Button
                  title="이 시간으로 확정"
                  onPress={() => handleAcceptSlot(index, slot)}
                  disabled={accepting !== null}
                  loading={accepting === index}
                  style={styles.slotAcceptBtn}
                />
              )}
            </View>
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
        {/* 취소 가능 상태는 DB 가드와 한 곳(constants)에서 맞춘다.
            직접 나열하던 시절 'meeting'(존재하지 않는 상태)이 섞이고
            approved는 DB가 거부하는데 버튼이 노출되는 문제가 있었다. */}
        {canUserCancel(consultationStatus) && (
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
  // 제안 슬롯 한 줄 — 시간과 확정 버튼을 좌우로 둔다
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  // 목록 안에 들어가는 버튼이라 가로를 내용만큼만 쓴다
  slotAcceptBtn: {
    paddingHorizontal: 14,
    minHeight: TOUCH_TARGET_MIN,
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
