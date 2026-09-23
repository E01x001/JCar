/**
 * JCar Design System - ConsultationCard Component
 *
 * Reusable consultation request card with dynamic status and action buttons.
 */

import React, { useState, useContext } from 'react';
import { logger } from '../utils/logger';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET_MIN } from '../theme/spacing';
import { formatPhone, formatWaiting } from '../utils/format';
import { updateConsultationStatus, settleConsultation, closeConsultationUnsettled, updateAdminMemo, updateSuggestedSlots } from '../services/consultation/consultationService';
import { useToast } from '../hooks/useToast';
import { CONSULTATION_STATUS } from '../constants';
import { AuthContext } from '../context/AuthContext';
import SpineCard from './admin/SpineCard';
import SettleConsultationModal from './modals/SettleConsultationModal';
import OwnershipTransferRow from './OwnershipTransferRow';
import RejectConsultationModal from './modals/RejectConsultationModal';
import AdminMemoModal from './modals/AdminMemoModal';
import SuggestAlternativeTimesModal from './modals/SuggestAlternativeTimesModal';

/**
 * ConsultationCard Component
 *
 * @param {Object} props
 * @param {Object} props.consultation - Consultation request data
 * @param {string} props.consultation.id - Consultation ID
 * @param {string} props.consultation.consultationStatus - Status: 'pending' | 'confirmed' | 'on-hold' | 'rejected' | 'completed'
 * @param {string} props.consultation.userName - Customer name
 * @param {string} props.consultation.userPhone - Customer phone number
 * @param {string} props.consultation.vehicleName - Vehicle name
 * @param {string} props.consultation.vehicleId - Vehicle ID
 * @param {string} props.consultation.preferredDate - Preferred consultation date
 * @param {string} props.consultation.preferredTime - Preferred consultation time
 * @param {Function} [props.onNavigateToVehicle] - Navigate to vehicle detail
 * @param {Function} [props.onUpdateSuccess] - Callback after successful status update
 * @param {Object} [props.style] - Additional styles
 */
/**
 * 보조 도구 버튼의 터치 확장. minHeight로 이미 최소 타깃을 확보했고, 이건
 * 좌우·상하로 조금 더 여유를 준다.
 *
 * RN 문서 주의사항: hitSlop은 **부모 뷰 경계를 넘지 못한다**. 그래서 hitSlop만
 * 믿지 않고 styles.tool의 minHeight/padding으로 실제 크기를 먼저 키웠다.
 */
const TOOL_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

/**
 * 정보 영역만 누를 수 있게 감싼다. onPress가 없으면 아무것도 감싸지 않는다.
 * 모듈 최상위에 두어 렌더마다 컴포넌트 정체성이 바뀌지 않게 한다(자식 remount 방지).
 */
const PressableInfo = ({ onPress, children }) => (onPress ? (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
    {children}
  </TouchableOpacity>
) : <>{children}</>);

PressableInfo.propTypes = {
  onPress: PropTypes.func,
  children: PropTypes.node,
};

const ConsultationCard = ({
  consultation,
  onNavigateToVehicle,
  onUpdateSuccess,
  style,
}) => {
  const theme = useTheme();
  const toast = useToast();
  const { user, role } = useContext(AuthContext);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [isMemoModalVisible, setIsMemoModalVisible] = useState(false);
  const [isSuggestTimesModalVisible, setIsSuggestTimesModalVisible] = useState(false);

  // Task 61: Optimistic UI state
  const [optimisticStatus, setOptimisticStatus] = useState(null);
  const [originalConsultation, setOriginalConsultation] = useState(null);

  const {
    id,
    consultationStatus,
    userName,
    userPhone,
    vehicleName,
    vehicleId,
    preferredDate,
    preferredTime,
    type,
    adminMemo = '',
    createdAt,
  } = consultation;

  // null 방어: 매퍼가 정규화하지만, 매퍼를 거치지 않고 들어오는 경로도 있다.
  // 구조분해 기본값은 undefined에만 적용돼 null을 막지 못한다.
  const alternativeSlots = Array.isArray(consultation.alternativeSlots)
    ? consultation.alternativeSlots
    : [];

  // Task 61: Use optimistic status if available, otherwise use actual status
  const displayStatus = optimisticStatus || consultationStatus;

  // 접수 후 경과 — 하루 미만이면 null이라 아무것도 그리지 않는다
  const waiting = formatWaiting(createdAt);

  const STATUS_LABEL = {
    pending: '대기중',
    'on-hold': '보류',
    approved: '승인됨',
    confirmed: '승인됨',
    meeting: '상담중',
    rejected: '거절됨',
    completed: '완료',
    archived: '보관됨',
    cancelled: '취소됨',
  };
  const CHIP_FOR = {
    pending: 'pending',
    'on-hold': 'pending',
    approved: 'approved',
    confirmed: 'approved',
    meeting: 'approved',
    rejected: 'rejected',
    completed: 'completed',
  };
  const statusLabel = STATUS_LABEL[displayStatus] || displayStatus;
  const statusTone = theme.colors.statusChip[CHIP_FOR[displayStatus] || 'neutral'].fg;

  /**
   * Handle status update with loading state and error handling
   * @param {string} newStatus - New consultation status
   */
  const handleStatusUpdate = async (newStatus) => {
    setIsUpdating(true);
    try {
      await updateConsultationStatus(id, newStatus);
      toast.showSuccess('상태가 성공적으로 변경되었습니다.');

      // Notify parent to refresh data
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error) {
      logger.error('상태 업데이트 실패:', error);
      toast.showError('업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle complete deal button - opens modal
   */
  const handleCompleteButtonPress = () => {
    setIsModalVisible(true);
  };

  /**
   * 체결 — 상담을 끝내고 명의이전 트랙을 연다.
   *
   * 예전에는 모달이 transferOwnership·vehicleId·sellerId·buyerId까지 넘겨줬는데
   * 받는 쪽에서 전부 버렸다. 모달은 "소유권을 이전합니다"라고 말하고 확인까지
   * 받는데 실제로는 아무 일도 일어나지 않았다. 이제 RPC가 이전 트랙을 만들고,
   * 소유권은 관리자가 "이전 완료"로 표시할 때 움직인다.
   */
  const handleSettle = async ({ dealAmount, adminNotes }) => {
    setOriginalConsultation(consultation);
    setOptimisticStatus(CONSULTATION_STATUS.COMPLETED);
    setIsModalVisible(false);
    toast.showInfo('거래를 처리하는 중입니다...');
    setIsUpdating(true);

    try {
      await settleConsultation({ consultationId: id, dealAmount, adminNotes });
      setOptimisticStatus(null);
      toast.showSuccess('체결되었습니다', '명의이전을 마치면 완료로 표시해주세요.');
      if (onUpdateSuccess) { onUpdateSuccess(); }
    } catch (error) {
      setOptimisticStatus(null);
      logger.error('체결 처리 실패:', error);
      toast.showError('오류', '체결 처리 중 문제가 발생했습니다.');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  /** 미체결 — 상담만 닫는다. 사유는 받지 않는다. */
  const handleCloseUnsettled = async () => {
    setOptimisticStatus('archived');
    setIsModalVisible(false);
    setIsUpdating(true);

    try {
      await closeConsultationUnsettled(id);
      setOptimisticStatus(null);
      toast.showSuccess('상담을 종료했습니다', '거래로 이어지지 않은 것으로 기록됩니다.');
      if (onUpdateSuccess) { onUpdateSuccess(); }
    } catch (error) {
      setOptimisticStatus(null);
      logger.error('미체결 처리 실패:', error);
      toast.showError('오류', '처리 중 문제가 발생했습니다.');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectButtonPress = () => {
    setIsRejectModalVisible(true);
  };

  /**
   * Handle rejection submission from modal
   * @param {string} rejectionReason - Reason for rejection
   */
  const handleRejectConsultation = async (rejectionReason) => {
    setIsUpdating(true);
    try {
      await updateConsultationStatus(id, CONSULTATION_STATUS.REJECTED, null, '', rejectionReason);
      toast.showSuccess('상담이 거절되었습니다.');
      setIsRejectModalVisible(false);

      // Notify parent to refresh data
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error) {
      logger.error('상담 거절 처리 실패:', error);
      toast.showError('거절 처리 중 오류가 발생했습니다.');
      throw error; // Re-throw for modal to handle
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle memo button - opens admin memo modal
   */
  const handleMemoButtonPress = () => {
    setIsMemoModalVisible(true);
  };

  /**
   * Handle admin memo submission from modal
   * @param {string} memo - Admin memo content
   */
  const handleUpdateMemo = async (memo) => {
    setIsUpdating(true);
    try {
      await updateAdminMemo(id, memo);
      toast.showSuccess('메모가 저장되었습니다.');
      setIsMemoModalVisible(false);

      // Notify parent to refresh data
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error) {
      logger.error('메모 저장 실패:', error);
      toast.showError('메모 저장 중 오류가 발생했습니다.');
      throw error; // Re-throw for modal to handle
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle suggest times button - opens alternative times modal
   */
  const handleSuggestTimesButtonPress = () => {
    setIsSuggestTimesModalVisible(true);
  };

  /**
   * Handle suggested slots submission from modal
   * @param {Array<Date>} slots - Array of suggested time slots
   */
  const handleUpdateSuggestedSlots = async (slots) => {
    setIsUpdating(true);
    try {
      await updateSuggestedSlots(id, slots);
      toast.showSuccess('대체 시간이 저장되었습니다.');
      setIsSuggestTimesModalVisible(false);

      // Notify parent to refresh data
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error) {
      logger.error('대체 시간 저장 실패:', error);
      toast.showError('대체 시간 저장 중 오류가 발생했습니다.');
      throw error; // Re-throw for modal to handle
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * 액션 — 주 동작 하나만 채우고 나머지는 아이콘으로 뺀다.
   *
   * 예전에는 채결·보류·거절 셋이 flex:1에 좌우 margin까지 붙어 같은 무게로
   * 나란히 있었다. 폭 계산이 어긋나 카드 밖으로 넘쳤고("거절"이 잘렸다),
   * 무엇을 눌러야 하는지도 알 수 없었다. gap 기반 배치로 바꾸고 위계를 준다.
   */
  const renderActionButtons = () => {
    if (isUpdating) {
      return (
        <View style={[styles.loadingContainer, { marginTop: theme.spacing.md }]}>
          <ActivityIndicator size="small" color={theme.colors.primary.main} />
          <Text
            style={[
              styles.loadingText,
              {
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.bodySmall,
                marginLeft: theme.spacing.sm,
              },
            ]}
          >
            업데이트 중...
          </Text>
        </View>
      );
    }

    // 상태마다 남은 결정이 다르다.
    //   pending  — 아직 받을지 말지. 승인 / 거절
    //   진행 중  — 상담을 했고 이제 결과를 남긴다. 상담 종료(체결/미체결)
    // 예전에는 approved에 아무 버튼도 없어서 **체결까지 갈 수가 없었다** —
    // 예약과 수락은 되는데 계약이 안 되던 원인이 이것이다.
    const isPending = displayStatus === CONSULTATION_STATUS.PENDING;
    const isRunning = [
      CONSULTATION_STATUS.APPROVED,
      CONSULTATION_STATUS.CONFIRMED,
      CONSULTATION_STATUS.ON_HOLD,
      'meeting',
    ].includes(displayStatus);

    // 메모는 끝난 상담에도 남길 수 있어야 한다. 예전에는 종료 상태에서 이
    // 함수가 곧바로 null을 반환해 **완료·거절 건에는 메모조차 달 수 없었다**
    // (관리자는 DB 가드를 통과하므로 막을 이유가 없었다).
    // 보류·일정 제안은 진행 중인 상담에만 의미가 있으므로 그대로 좁게 둔다.
    const canDecide = isPending || isRunning;
    // 이미 보류인 건을 다시 보류할 이유는 없다
    const canHold = canDecide && displayStatus !== CONSULTATION_STATUS.ON_HOLD;

    return (
      <>
        {/* 결정 두 개는 글자로 — 아이콘만 두면 무엇을 누르는지 알 수 없다.
            거절은 사유를 적어 보내는 동작이라 특히 숨기면 안 된다(모달이 열린다). */}
        {canDecide ? (
        <View style={styles.decisionRow}>
          {isPending ? (
            <>
              <TouchableOpacity
                onPress={() => handleStatusUpdate(CONSULTATION_STATUS.APPROVED)}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[styles.decision, { backgroundColor: theme.colors.primary.main }]}
              >
                <Text style={[styles.decisionText, { color: theme.colors.text.white }]}>승인</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRejectButtonPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityHint="거절 사유를 입력해 신청자에게 보냅니다"
                style={[styles.decision, { backgroundColor: theme.colors.statusChip.rejected.bg }]}
              >
                <Text style={[styles.decisionText, { color: theme.colors.statusChip.rejected.fg }]}>
                  거절
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={handleCompleteButtonPress}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityHint="체결 또는 미체결을 선택해 상담을 마칩니다"
              style={[styles.decision, { backgroundColor: theme.colors.primary.main }]}
            >
              <Text style={[styles.decisionText, { color: theme.colors.text.white }]}>상담 종료</Text>
            </TouchableOpacity>
          )}
        </View>
        ) : null}

        {/* 보조 도구 — 결정이 아니라 부가 작업이라 아이콘 + 라벨로 작게.
            작게 그리더라도 터치 영역은 TOUCH_TARGET_MIN을 지킨다(theme/spacing.js). */}
        <View style={styles.toolRow}>
          {canHold ? (
            <TouchableOpacity
              onPress={() => handleStatusUpdate(CONSULTATION_STATUS.ON_HOLD)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="이 상담을 보류로 변경"
              hitSlop={TOOL_HIT_SLOP}
              style={styles.tool}
            >
              <MaterialIcons name="pause-circle-outline" size={17} color={theme.colors.text.secondary} />
              <Text style={[styles.toolText, { color: theme.colors.text.secondary }]}>보류</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleMemoButtonPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={adminMemo ? '관리자 메모 수정' : '관리자 메모 작성'}
            hitSlop={TOOL_HIT_SLOP}
            style={styles.tool}
          >
            <MaterialIcons
              name={adminMemo ? 'note' : 'note-add'}
              size={17}
              color={adminMemo ? theme.colors.primary.main : theme.colors.text.secondary}
            />
            <Text
              style={[styles.toolText, {
                color: adminMemo ? theme.colors.primary.main : theme.colors.text.secondary,
              }]}
            >
              메모
            </Text>
          </TouchableOpacity>

          {canDecide ? (
          <TouchableOpacity
            onPress={handleSuggestTimesButtonPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="대체 일정 제안"
            hitSlop={TOOL_HIT_SLOP}
            style={styles.tool}
          >
            <MaterialIcons
              name="event-repeat"
              size={17}
              color={alternativeSlots.length > 0 ? theme.colors.primary.main : theme.colors.text.secondary}
            />
            <Text
              style={[styles.toolText, {
                color: alternativeSlots.length > 0 ? theme.colors.primary.main : theme.colors.text.secondary,
              }]}
            >
              일정 제안{alternativeSlots.length > 0 ? ` ${alternativeSlots.length}` : ''}
            </Text>
          </TouchableOpacity>
          ) : null}
        </View>
      </>
    );
  };

  const handleCardPress = () => {
    if (onNavigateToVehicle && vehicleId) {
      onNavigateToVehicle(vehicleId);
    }
  };

  return (
    <>
      {/*
        카드 전체를 터치러블로 만들지 않는다.

        예전에는 SpineCard에 onPress를 넘겨 카드 전체가 눌렸다. 그 안의 보조
        버튼(보류·메모·일정 제안)은 높이를 지정하지 않아 실제 17px로 렌더됐고,
        손가락 탭이 빗나가면 그 탭을 부모가 받아 **차량 상세로 이동**했다.
        안드로이드에서만 재현된 이유가 이것이다 — 마우스는 픽셀 단위로 정확하다.
        지금은 정보 영역만 누를 수 있고 액션 영역은 터치러블 밖에 있다.
        (중첩 인터랙티브 요소는 스크린리더에도 혼란을 준다.)
      */}
      <SpineCard
        status={displayStatus}
        style={[{ marginBottom: theme.spacing.sm }, style]}
      >
        <PressableInfo onPress={onNavigateToVehicle && vehicleId ? handleCardPress : undefined}>
        {/* 이름 · 유형 · 차량 / 오른쪽에 일정과 대기 기간 */}
        <View style={styles.topRow}>
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.userName, { color: theme.colors.text.primary }]}
                numberOfLines={1}
              >
                {userName}
              </Text>
              {type ? (
                <View style={[styles.typeTag, { backgroundColor: theme.colors.tag.neutral.bg }]}>
                  <Text style={[styles.typeTagText, { color: theme.colors.tag.neutral.fg }]}>
                    {type === 'sell' ? '판매' : '구매'}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.vehicleName, { color: theme.colors.text.secondary }]} numberOfLines={1}>
              {vehicleName}
            </Text>
          </View>

          <View style={styles.meta}>
            <Text style={[styles.schedule, { color: theme.colors.text.primary }]}>
              {preferredDate} {preferredTime}
            </Text>
            {/* 대기 기간이 있으면 그것을, 없으면 상태를 말한다.
                "무엇이 급한가"가 목록을 훑는 유일한 이유다. */}
            {waiting && displayStatus === CONSULTATION_STATUS.PENDING ? (
              <Text style={[styles.waiting, { color: theme.colors.statusChip.pending.fg }]}>
                {waiting}
              </Text>
            ) : (
              <Text style={[styles.waiting, { color: statusTone }]}>{statusLabel}</Text>
            )}
          </View>
        </View>

        <Text style={[styles.phone, { color: theme.colors.text.secondary }]}>
          {formatPhone(userPhone)}
        </Text>
        </PressableInfo>

        {renderActionButtons()}

        {/* 체결된 상담에는 명의이전 트랙이 딸려 있다. 실제 이전은 관리자가
            오프라인으로 처리하고 여기서 진행 상태를 표시한다. */}
        {displayStatus === CONSULTATION_STATUS.COMPLETED ? (
          <OwnershipTransferRow consultationId={id} isAdmin={role === 'admin'} />
        ) : null}
      </SpineCard>

      <SettleConsultationModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSettle={handleSettle}
        onCloseUnsettled={handleCloseUnsettled}
        isSellType={type === 'sell'}
        vehicleName={vehicleName}
      />

      {/* Reject Consultation Modal */}
      <RejectConsultationModal
        isVisible={isRejectModalVisible}
        onClose={() => setIsRejectModalVisible(false)}
        onSubmit={handleRejectConsultation}
        consultationId={id}
      />

      {/* Admin Memo Modal */}
      <AdminMemoModal
        isVisible={isMemoModalVisible}
        onClose={() => setIsMemoModalVisible(false)}
        onSubmit={handleUpdateMemo}
        initialMemo={adminMemo}
        consultationId={id}
      />

      {/* Suggest Alternative Times Modal */}
      <SuggestAlternativeTimesModal
        isVisible={isSuggestTimesModalVisible}
        onClose={() => setIsSuggestTimesModalVisible(false)}
        onSubmit={handleUpdateSuggestedSlots}
        initialSlots={alternativeSlots}
        consultationId={id}
      />
    </>
  );
};

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  identity: { flex: 1, minWidth: 0, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  typeTag: { borderRadius: 5, paddingVertical: 2, paddingHorizontal: 6 },
  typeTagText: { fontSize: 11, fontWeight: '600' },
  vehicleName: { fontSize: 13 },
  meta: { alignItems: 'flex-end', gap: 3 },
  schedule: { fontSize: 14, fontWeight: '700' },
  waiting: { fontSize: 11, fontWeight: '600' },
  phone: { fontSize: 13, marginTop: 10 },

  // margin이 아니라 gap으로 띄운다. margin은 flex:1과 합쳐지면 폭 계산이
  // 어긋나 카드 밖으로 넘친다(예전 버그).
  decisionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  decision: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  decisionText: { fontSize: 14, fontWeight: '600' },

  // gap을 18 → 8로 줄였다. 각 버튼이 자기 패딩으로 간격을 확보하므로, 예전
  // 간격을 그대로 두면 버튼 사이가 과하게 벌어진다.
  toolRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginLeft: -8 },
  // 아이콘(17px)만큼만 높던 것을 최소 터치 타깃까지 키운다. 시각적으로는
  // 여전히 작아 보이지만(배경 없음) 실제로 누를 수 있는 영역이 생긴다.
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: 8,
  },
  toolText: { fontSize: 12, fontWeight: '600' },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {},
});

ConsultationCard.propTypes = {
  consultation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    consultationStatus: PropTypes.oneOf(['pending', 'confirmed', 'on-hold', 'rejected', 'completed']).isRequired,
    userName: PropTypes.string.isRequired,
    userPhone: PropTypes.string.isRequired,
    vehicleName: PropTypes.string.isRequired,
    vehicleId: PropTypes.string.isRequired,
    preferredDate: PropTypes.string.isRequired,
    preferredTime: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['buy', 'sell']),
  }).isRequired,
  onNavigateToVehicle: PropTypes.func,
  onUpdateSuccess: PropTypes.func,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default ConsultationCard;
