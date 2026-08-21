/**
 * JCar Design System - API Progress Overlay
 *
 * 단일 API 요청 대기 중 추정형 진행률 + 안내 문구를 모달로 표시.
 * useFakeProgress 훅과 함께 사용한다(재사용 목적).
 */

import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

/**
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {number} props.progress - 0~100
 * @param {string} [props.message] - 안내 문구
 * @param {string} [props.title='조회 중'] - 상단 제목
 */
const ApiProgressOverlay = ({ visible, progress, message, title = '조회 중' }) => {
  const theme = useTheme();
  const c = theme.colors;
  const pct = Math.max(0, Math.min(100, Math.round(progress || 0)));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.background.card }]}>
          <Text style={[styles.title, { color: c.text.secondary }]}>{title}</Text>
          <Text style={[styles.percent, { color: c.primary.main }]}>{pct}%</Text>

          <View style={[styles.track, { backgroundColor: c.background.tertiary }]}>
            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: c.primary.main }]} />
          </View>

          {message ? (
            <Text style={[styles.message, { color: c.text.secondary }]}>{message}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,22,38,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  card: {
    borderRadius: 22,
    paddingVertical: 30,
    paddingHorizontal: 26,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.detail,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  percent: {
    fontSize: 40,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  track: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 18,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  message: {
    fontSize: typography.fontSize.body,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 16,
  },
});

ApiProgressOverlay.propTypes = {
  visible: PropTypes.bool,
  progress: PropTypes.number,
  message: PropTypes.string,
  title: PropTypes.string,
};

export default ApiProgressOverlay;
