/**
 * JCar Design System - 전역 Pretendard 적용
 *
 * Android에서는 fontWeight만으로 정적 Pretendard 웨이트가 선택되지 않는다.
 * Text/TextInput의 render를 감싸 style의 fontWeight를 보고 알맞은 Pretendard
 * 패밀리(fontFamily)를 주입한다 → 화면마다 수정하지 않아도 앱 전체가 Pretendard.
 *
 * 방어적으로 작성: 패치가 불가능한 환경이면 조용히 건너뛰고 시스템 폰트로 폴백한다.
 * 폰트 에셋이 링크되어 있어야 실제 적용됨(react-native.config.js + `npx react-native-asset`).
 */

import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { familyForWeight } from './fonts';

let applied = false;

const patch = (Component) => {
  const original = Component.render;
  if (typeof original !== 'function') { return; }

  Component.render = function patchedRender(...args) {
    const element = original.apply(this, args);
    if (!element || !element.props) { return element; }

    const flat = StyleSheet.flatten(element.props.style) || {};
    // 사용자가 명시한 fontFamily가 있으면 존중, 없으면 weight로 결정
    const fontFamily = flat.fontFamily || familyForWeight(flat.fontWeight);

    return React.cloneElement(element, {
      style: [{ fontFamily }, element.props.style],
    });
  };
};

export const applyPretendard = () => {
  if (applied) { return; }
  applied = true;
  try {
    patch(Text);
    patch(TextInput);
  } catch (e) {
    // 폴백: 시스템 폰트 유지
    applied = false;
  }
};

export default applyPretendard;
