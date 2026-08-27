/**
 * BuildInfo — 지금 돌고 있는 것이 어떤 빌드/업데이트인지.
 *
 * OTA를 도입하면 "설치된 앱 버전"과 "실행 중인 JS"가 갈린다. 스토어 버전은
 * 1.0.17인데 그 위에 OTA로 다른 JS가 얹혀 있을 수 있고, 그러면 버그 신고를
 * 받아도 무엇이 돌고 있었는지 알 수 없다.
 *
 * 그리고 OTA는 **조용히 실패한다.** 채널이나 런타임 지문이 어긋나면 오류 없이
 * 아무것도 오지 않는다. 여기서 채널·지문·업데이트 ID를 보여주면 그 진단이
 * 눈으로 가능해진다.
 *
 * expo-updates는 웹에서 동작하지 않으므로 값이 없을 때를 항상 감안한다.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import PropTypes from 'prop-types';
import * as Updates from 'expo-updates';
import * as Application from 'expo-application';
import { useTheme } from '../../theme/ThemeProvider';

/** 'a1b2c3d4-…' → 'a1b2c3d4' — 화면에서 식별만 되면 된다 */
const shortId = (id) => (typeof id === 'string' ? id.slice(0, 8) : null);

const BuildInfo = () => {
  const theme = useTheme();

  const rows = [
    ['앱 버전', `${Application.nativeApplicationVersion ?? '-'} (${Application.nativeBuildVersion ?? '-'})`],
    ['업데이트 채널', Updates.channel || '(없음)'],
    ['런타임', shortId(Updates.runtimeVersion) ?? (Updates.runtimeVersion || '-')],
    [
      '실행 중인 JS',
      // isEmbeddedLaunch: 스토어 빌드에 들어 있던 번들 그대로.
      // false면 OTA로 받은 것이 얹혀 있다는 뜻이다.
      Updates.isEmbeddedLaunch
        ? '내장 번들'
        : `OTA · ${shortId(Updates.updateId) ?? '알 수 없음'}`,
    ],
  ];

  return (
    <View style={[styles.wrap, { borderTopColor: theme.colors.border.light }]}>
      <Text style={[styles.title, { color: theme.colors.text.secondary }]}>빌드 정보</Text>

      {rows.map(([k, v]) => (
        <View key={k} style={styles.row}>
          <Text style={[styles.key, { color: theme.colors.text.tertiary }]}>{k}</Text>
          <Text style={[styles.value, { color: theme.colors.text.primary }]} numberOfLines={1}>
            {v}
          </Text>
        </View>
      ))}

      {Platform.OS === 'web' ? (
        <Text style={[styles.note, { color: theme.colors.text.tertiary }]}>
          웹에서는 OTA가 동작하지 않습니다.
        </Text>
      ) : null}
    </View>
  );
};

BuildInfo.propTypes = {
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

const styles = StyleSheet.create({
  wrap: { paddingTop: 16, marginTop: 8, borderTopWidth: 1, gap: 7 },
  title: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 3 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  key: { fontSize: 12 },
  value: { fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  note: { fontSize: 11, marginTop: 4 },
});

export default BuildInfo;
