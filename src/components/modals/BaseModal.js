/**
 * BaseModal — 모달 껍데기(오버레이·백드롭·키보드 회피)를 한 곳에 모은다.
 *
 * 존재 이유: 모달 6개가 각자 같은 구조를 복사해 쓰고 있었다(총 2,348줄).
 * 그 결과 **딤 색상이 두 종류로 갈렸다** — 가운데 대화상자는 rgba(0,0,0,0.75),
 * 바텀시트는 rgba(15,22,38,0.55). 같은 앱에서 배경이 어두워지는 정도가 달랐다.
 * 백드롭 탭 처리·키보드 회피도 파일마다 미묘하게 달랐다.
 *
 * 두 변형만 존재하며, 그 차이는 의도된 것이라 유지한다:
 *   center — 가운데 대화상자 (fade)
 *   sheet  — 하단에서 올라오는 시트 (slide)
 * 딤 색상은 하나로 통일했다. 변형에 따라 스크림 색이 달라야 할 이유가 없다.
 *
 * children은 **내용 카드만** 넘긴다. Modal/오버레이/백드롭은 여기서 그린다.
 */
import React from 'react';
import {
  Modal, View, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';

/** 통일된 스크림 색 — 기존 두 값(검정 0.75 / 네이비 0.55) 중 디자인 시안 쪽을 택했다 */
const SCRIM = 'rgba(15, 22, 38, 0.55)';

const BaseModal = ({
  visible,
  onClose,
  variant = 'center',
  avoidKeyboard = true,
  dismissOnBackdrop = true,
  backdropDisabled = false,
  children,
  contentStyle,
}) => {
  const isSheet = variant === 'sheet';

  // 시트는 내용이 화면 폭을 꽉 채우고, 대화상자는 좌우 여백을 두고 가운데 정렬한다
  const inner = isSheet ? styles.sheetInner : styles.centerInner;

  const body = (
    <View style={[inner, contentStyle]} pointerEvents="box-none">
      {children}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isSheet ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isSheet ? styles.overlaySheet : styles.overlayCenter]}>
        {/* 백드롭 — 탭하면 닫힌다. 처리 중(backdropDisabled)에는 잠근다. */}
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, styles.scrim]}
          activeOpacity={1}
          onPress={dismissOnBackdrop ? onClose : undefined}
          disabled={backdropDisabled || !dismissOnBackdrop}
          accessible={false}
        />

        {avoidKeyboard ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.kav}
          >
            {body}
          </KeyboardAvoidingView>
        ) : body}
      </View>
    </Modal>
  );
};

BaseModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  /** 백드롭 탭·안드로이드 뒤로가기로 닫을 때 호출 */
  onClose: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['center', 'sheet']),
  avoidKeyboard: PropTypes.bool,
  /** 백드롭 탭으로 닫히지 않게 하려면 false */
  dismissOnBackdrop: PropTypes.bool,
  /** 처리 중 등 일시적으로 백드롭을 잠글 때 */
  backdropDisabled: PropTypes.bool,
  children: PropTypes.node,
  contentStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  overlayCenter: { justifyContent: 'center', alignItems: 'center' },
  overlaySheet: { justifyContent: 'flex-end' },
  scrim: { backgroundColor: SCRIM },
  kav: { width: '100%' },
  centerInner: { width: '100%', alignItems: 'center', paddingHorizontal: 20 },
  sheetInner: { width: '100%' },
});

export default BaseModal;
