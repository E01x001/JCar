/**
 * SettleConsultationModal — 상담을 끝낼 때 결과를 고른다.
 *
 * 예전 CompleteDealModal은 "거래완료" 하나로 상담 종료·체결·매입·소유권을
 * 동시에 처리했다. 그래서 **상담은 끝났는데 체결이 안 된 경우**를 표현할 수
 * 없었고, 그 자리를 addToOwnedVehicles 체크박스가 어정쩡하게 메우고 있었다.
 * 판매든 구매든 실제로는 무산될 수 있다.
 *
 * 그래서 묻는 질문을 바꾼다: "재고에 추가할까?"가 아니라 "체결됐는가?".
 *
 * 체결하면 명의이전 트랙이 열릴 뿐, 소유권은 아직 움직이지 않는다.
 * 실제 이전은 관리자가 오프라인으로 처리하고 나중에 표시한다.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import Icon from '@expo/vector-icons/MaterialIcons';
import BaseModal from './BaseModal';
import { useTheme } from '../../theme/ThemeProvider';

const SettleConsultationModal = ({
  isVisible,
  onClose,
  onSettle,
  onCloseUnsettled,
  isSellType = false,
  vehicleName,
}) => {
  const theme = useTheme();
  const [outcome, setOutcome] = useState(null); // 'settled' | 'unsettled'
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isVisible) {
      setOutcome(null);
      setAmount('');
      setNotes('');
      setError(null);
      setSubmitting(false);
    }
  }, [isVisible]);

  /** 숫자만 남기고 천 단위 구분 — 금액은 잘못 읽기 쉬운 값이다 */
  const onAmountChange = (text) => {
    const digits = text.replace(/[^0-9]/g, '');
    setAmount(digits ? Number(digits).toLocaleString('ko-KR') : '');
  };
  const amountValue = Number(amount.replace(/,/g, ''));

  const submit = async () => {
    setError(null);

    if (outcome === 'unsettled') {
      setSubmitting(true);
      try {
        await onCloseUnsettled();
      } catch {
        setError('처리 중 문제가 발생했습니다.');
        setSubmitting(false);
      }
      return;
    }

    if (!amountValue || amountValue <= 0) {
      setError('거래 금액을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await onSettle({ dealAmount: amountValue, adminNotes: notes.trim() });
    } catch {
      setError('처리 중 문제가 발생했습니다.');
      setSubmitting(false);
    }
  };

  const Choice = ({ value, icon, title, desc }) => {
    const selected = outcome === value;
    return (
      <TouchableOpacity
        onPress={() => { setOutcome(value); setError(null); }}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={[
          styles.choice,
          {
            borderColor: selected ? theme.colors.primary.main : theme.colors.border.subtle,
            backgroundColor: selected ? theme.colors.tag.accent.bg : theme.colors.background.card,
          },
        ]}
      >
        <Icon
          name={icon}
          size={20}
          color={selected ? theme.colors.primary.main : theme.colors.text.tertiary}
        />
        <View style={styles.choiceText}>
          <Text style={[styles.choiceTitle, {
            color: selected ? theme.colors.primary.main : theme.colors.text.primary,
          }]}>
            {title}
          </Text>
          <Text style={[styles.choiceDesc, { color: theme.colors.text.secondary }]}>{desc}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  Choice.propTypes = {
    value: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    desc: PropTypes.string.isRequired,
  };

  return (
    <BaseModal variant="center" visible={isVisible} onClose={onClose} backdropDisabled={submitting}>
      <View style={[styles.card, { backgroundColor: theme.colors.background.card }]}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>상담 종료</Text>
        {vehicleName ? (
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]} numberOfLines={1}>
            {vehicleName}
          </Text>
        ) : null}

        <View style={styles.choices}>
          <Choice
            value="settled"
            icon="handshake"
            title="체결됨"
            desc={isSellType ? '차량을 매입하기로 했습니다' : '차량을 판매하기로 했습니다'}
          />
          <Choice
            value="unsettled"
            icon="do-not-disturb-on"
            title="미체결"
            desc="상담은 했지만 거래로 이어지지 않았습니다"
          />
        </View>

        {outcome === 'settled' ? (
          <View style={styles.form}>
            <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
              {isSellType ? '매입 금액' : '판매 금액'}
            </Text>
            <View style={[styles.amountRow, { borderColor: theme.colors.border.subtle }]}>
              <TextInput
                value={amount}
                onChangeText={onAmountChange}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.text.tertiary}
                style={[styles.amountInput, { color: theme.colors.text.primary }]}
                accessibilityLabel="거래 금액"
              />
              <Text style={[styles.won, { color: theme.colors.text.secondary }]}>원</Text>
            </View>

            <Text style={[styles.label, { color: theme.colors.text.secondary }]}>메모 (선택)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="거래 조건, 특이사항 등"
              placeholderTextColor={theme.colors.text.tertiary}
              style={[styles.notes, {
                color: theme.colors.text.primary,
                borderColor: theme.colors.border.subtle,
              }]}
            />

            {/* 체결이 곧 명의이전이 아니라는 것을 여기서 분명히 한다 */}
            <View style={[styles.hint, { backgroundColor: theme.colors.statusChip.completed.bg }]}>
              <Icon name="info-outline" size={16} color={theme.colors.primary.main} />
              <Text style={[styles.hintText, { color: theme.colors.primary.main }]}>
                체결하면 명의이전 대기 상태가 됩니다. 실제 이전을 마친 뒤 완료로 표시해주세요.
              </Text>
            </View>
          </View>
        ) : null}

        {error ? (
          <Text style={[styles.error, { color: theme.colors.danger.main }]}>{error}</Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onClose}
            disabled={submitting}
            activeOpacity={0.8}
            accessibilityRole="button"
            style={[styles.action, { borderWidth: 1, borderColor: theme.colors.border.subtle }]}
          >
            <Text style={[styles.actionText, { color: theme.colors.text.secondary }]}>취소</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={submit}
            disabled={submitting || !outcome}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[styles.action, {
              backgroundColor: outcome ? theme.colors.primary.main : theme.colors.background.disabled,
            }]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.text.white} />
            ) : (
              <Text style={[styles.actionText, {
                color: outcome ? theme.colors.text.white : theme.colors.text.tertiary,
              }]}>
                확인
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BaseModal>
  );
};

SettleConsultationModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  /** ({ dealAmount, adminNotes }) => Promise */
  onSettle: PropTypes.func.isRequired,
  /** () => Promise */
  onCloseUnsettled: PropTypes.func.isRequired,
  isSellType: PropTypes.bool,
  vehicleName: PropTypes.string,
};

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 420, borderRadius: 20, padding: 22, gap: 6 },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 13, marginBottom: 8 },

  choices: { gap: 8, marginTop: 10 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  choiceText: { flex: 1, gap: 2 },
  choiceTitle: { fontSize: 15, fontWeight: '700' },
  choiceDesc: { fontSize: 12 },

  form: { gap: 8, marginTop: 16 },
  label: { fontSize: 12, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  amountInput: { flex: 1, height: 48, fontSize: 17, fontWeight: '700' },
  won: { fontSize: 14, fontWeight: '600' },
  notes: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 72, fontSize: 14, textAlignVertical: 'top' },

  hint: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12, marginTop: 4 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' },

  error: { fontSize: 12, fontWeight: '600', marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 18 },
  action: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '600' },
});

export default SettleConsultationModal;
