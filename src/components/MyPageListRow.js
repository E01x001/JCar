/**
 * MyPageListRow — 마이페이지 3개 탭(구매 상담·판매 상담·내 차량)이 공유하는 목록 행.
 *
 * 존재 이유: 세 탭이 같은 모양의 행을 각자 구현하면서 조금씩 어긋나 있었다.
 *   썸네일  내 차량 56x56/radius 14   ↔ 상담 탭 50x50/radius 12
 *   이름    16                        ↔ 15
 *   간격    gap 14                    ↔ 13
 *   컨테이너 구분선 행                 ↔ Card elevated
 * 게다가 상담 탭 두 개는 썸네일 자리에 **빈 View만 있었다** — 이미지가 나올 수 없었다.
 *
 * 구조: [썸네일] [제목 / 보조문구] [우측 슬롯]  + 필요 시 하단 부가 영역
 *
 * @param {string} [props.imageUrl] - 차량 이미지. 없으면 차 아이콘 플레이스홀더.
 * @param {string} props.title
 * @param {React.ReactNode} [props.titleAccessory] - 제목 옆 태그 등
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.right] - 상태 배지·가격 라벨 등
 * @param {React.ReactNode} [props.footer] - 거절 사유 등 행 아래 부가 정보
 * @param {Function} props.onPress
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import Icon from '@expo/vector-icons/MaterialIcons';
import Card from './Card';
import { useTheme } from '../theme/ThemeProvider';

/** imageUrl은 배열 또는 문자열로 올 수 있다(레거시 호환) */
const resolveImage = (imageUrl) => {
  if (Array.isArray(imageUrl)) { return imageUrl[0] || null; }
  return imageUrl || null;
};

const MyPageListRow = ({
  imageUrl, title, titleAccessory, subtitle, right, footer, onPress,
}) => {
  const theme = useTheme();
  const image = resolveImage(imageUrl);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card elevated style={{ marginBottom: theme.spacing.sm }}>
        <View style={styles.row}>
          {image ? (
            <Image source={{ uri: image }} style={[styles.thumb, styles.thumbBg]} resizeMode="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbBg, styles.thumbEmpty]}>
              <Icon name="directions-car" size={26} color="#A9B4C7" />
            </View>
          )}

          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, { color: theme.colors.text.primary }]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {titleAccessory}
            </View>
            {subtitle ? (
              <Text
                style={[styles.subtitle, { color: theme.colors.text.secondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          {right}
        </View>

        {footer}
      </Card>
    </TouchableOpacity>
  );
};

MyPageListRow.propTypes = {
  imageUrl: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  title: PropTypes.string,
  titleAccessory: PropTypes.node,
  subtitle: PropTypes.string,
  right: PropTypes.node,
  footer: PropTypes.node,
  onPress: PropTypes.func,
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 56, height: 56, borderRadius: 14 },
  thumbBg: { backgroundColor: '#EEF1F5' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  subtitle: { fontSize: 12, marginTop: 3 },
});

export default MyPageListRow;
