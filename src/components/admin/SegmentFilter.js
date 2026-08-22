/**
 * SegmentFilter — 상태 필터 알약.
 *
 * TabView를 쓰던 자리를 대신한다. 탭은 "다른 화면으로 간다"는 신호인데
 * 구매/판매/완료는 같은 목록의 다른 조각일 뿐이라 필터가 맞다.
 * 덤으로 TabView가 세 탭을 모두 마운트하던 비용도 사라진다.
 *
 * 선택된 칩만 채우고, 건수는 선택 여부에 따라 대비를 달리한다.
 *
 * @param {Array<{key: string, label: string, count?: number}>} props.items
 * @param {string} props.value - 선택된 key
 * @param {Function} props.onChange - (key) => void
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../../theme/ThemeProvider';

const SegmentFilter = ({ items, value, onChange }) => {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // flexGrow: 0 — 세로 flex 컨테이너 안의 ScrollView는 남은 높이를 전부
      // 차지한다. 그러면 알약이 그 안에서 세로 가운데로 밀려 위아래에 빈 띠가 생긴다.
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onChange(item.key)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              selected
                ? { backgroundColor: theme.colors.primary.main }
                : { borderWidth: 1, borderColor: theme.colors.border.subtle },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? theme.colors.text.white : theme.colors.text.secondary,
                  fontWeight: selected ? '600' : '500',
                },
              ]}
            >
              {item.label}
            </Text>

            {typeof item.count === 'number' ? (
              <Text
                style={[
                  styles.count,
                  selected
                    ? {
                      color: theme.colors.primary.main,
                      backgroundColor: theme.colors.background.card,
                      overflow: 'hidden',
                    }
                    : { color: theme.colors.text.tertiary },
                ]}
              >
                {item.count}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

SegmentFilter.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    count: PropTypes.number,
  })).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { paddingHorizontal: 22, paddingBottom: 14, gap: 7, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  label: { fontSize: 13 },
  count: {
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
});

export default SegmentFilter;
