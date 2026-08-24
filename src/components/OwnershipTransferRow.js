/**
 * OwnershipTransferRow — 체결된 거래의 명의이전 진행 상태.
 *
 * 실제 명의이전은 관리자가 등록원부에서 오프라인으로 처리한다. 앱이 하는 일은
 * 그 진행을 **기록하고 보여주는 것**뿐이다. 자동으로 명의를 넘기는 척하지 않는다.
 *
 * 앱 쪽 소유권(vehicles.current_owner_id)은 '이전 완료'로 표시하는 순간에만
 * 움직인다 — RPC advance_ownership_transfer가 한 트랜잭션으로 처리한다.
 * 앱의 소유자 정보가 등록원부를 따라가야지 앞서가면 안 된다.
 *
 * 관리자에게는 다음 단계로 넘기는 버튼이, 신청자에게는 진행 상태만 보인다.
 * (신청자도 볼 수 있어야 한다 — 예전에는 관리자만 조회할 수 있어서 판매자·구매자가
 *  자기 거래가 어디까지 갔는지 알 방법이 없었다.)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import PropTypes from 'prop-types';
import Icon from '@expo/vector-icons/MaterialIcons';
import { logger } from '../utils/logger';
import { useTheme } from '../theme/ThemeProvider';
import {
  getTransferByConsultation,
  advanceOwnershipTransfer,
} from '../services/ownershipTransferService';

const STEPS = [
  { key: 'pending', label: '이전 대기' },
  { key: 'in_progress', label: '서류 진행중' },
  { key: 'completed', label: '이전 완료' },
];

const NEXT = { pending: 'in_progress', in_progress: 'completed' };

const OwnershipTransferRow = ({ consultationId, isAdmin }) => {
  const theme = useTheme();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      setTransfer(await getTransferByConsultation(consultationId));
    } catch (error) {
      // 조회 실패가 카드 전체를 막지 않게 한다 — 상담 정보는 계속 보여야 한다
      logger.error('명의이전 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [consultationId]);

  useEffect(() => { load(); }, [load]);

  const advance = () => {
    const next = NEXT[transfer?.status];
    if (!next) { return; }

    const isFinal = next === 'completed';
    Alert.alert(
      isFinal ? '이전 완료 확인' : '서류 진행중으로 변경',
      isFinal
        ? '등록원부상 명의이전이 끝났습니까?\n\n완료로 표시하면 앱의 차량 소유자도 함께 바뀌며, 되돌릴 수 없습니다.'
        : '명의이전 서류 절차를 시작한 것으로 표시합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: isFinal ? '완료로 표시' : '변경',
          style: isFinal ? 'destructive' : 'default',
          onPress: async () => {
            setUpdating(true);
            try {
              await advanceOwnershipTransfer(transfer.id, next);
              await load();
            } catch (error) {
              logger.error('명의이전 상태 변경 실패:', error);
              Alert.alert('오류', '상태를 변경하지 못했습니다.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !transfer) { return null; }

  const currentIndex = STEPS.findIndex((s) => s.key === transfer.status);
  const done = transfer.status === 'completed';

  return (
    <View style={[styles.wrap, { borderTopColor: theme.colors.border.light }]}>
      <View style={styles.head}>
        <Icon
          name={done ? 'verified' : 'assignment'}
          size={16}
          color={done ? theme.colors.statusChip.approved.fg : theme.colors.text.secondary}
        />
        <Text style={[styles.title, { color: theme.colors.text.secondary }]}>명의이전</Text>
        <Text style={[styles.status, {
          color: done ? theme.colors.statusChip.approved.fg : theme.colors.statusChip.pending.fg,
        }]}>
          {STEPS[currentIndex]?.label ?? transfer.status}
        </Text>
      </View>

      {/* 진행 막대 — 세 단계 중 어디인지 한눈에 */}
      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View
            key={step.key}
            style={[
              styles.step,
              {
                backgroundColor: i <= currentIndex
                  ? (done ? theme.colors.statusChip.approved.dot : theme.colors.primary.main)
                  : theme.colors.border.light,
              },
            ]}
          />
        ))}
      </View>

      {isAdmin && !done ? (
        <TouchableOpacity
          onPress={advance}
          disabled={updating}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={[styles.button, { borderColor: theme.colors.border.subtle }]}
        >
          {updating ? (
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.colors.primary.main }]}>
              {transfer.status === 'pending' ? '서류 진행중으로' : '이전 완료로 표시'}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

OwnershipTransferRow.propTypes = {
  consultationId: PropTypes.string.isRequired,
  isAdmin: PropTypes.bool,
};

const styles = StyleSheet.create({
  wrap: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, gap: 9 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { flex: 1, fontSize: 12, fontWeight: '600' },
  status: { fontSize: 12, fontWeight: '700' },
  steps: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, height: 4, borderRadius: 2 },
  button: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  buttonText: { fontSize: 13, fontWeight: '700' },
});

export default OwnershipTransferRow;
