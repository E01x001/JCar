/**
 * ImageCarousel — swipeable vehicle image gallery (Task 127)
 *
 * Renders an array of image URLs as swipeable pages with a dot indicator.
 * Falls back to a placeholder when there are no images.
 */

import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';

const { width } = Dimensions.get('window');
const DEFAULT_HEIGHT = ((width - 32) * 9) / 16;

const CarouselImage = ({ uri }) => {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.image, styles.imageFallback, { backgroundColor: theme.colors.background.secondary }]}>
        <MaterialIcons name="broken-image" size={40} color={theme.colors.text.tertiary} />
      </View>
    );
  }

  return (
    <Image source={{ uri }} style={styles.image} resizeMode="cover" onError={() => setFailed(true)} />
  );
};

CarouselImage.propTypes = { uri: PropTypes.string };

const ImageCarousel = ({ images = [], height = DEFAULT_HEIGHT, style }) => {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  // 실제 렌더 폭을 측정해 페이지 계산에 쓴다.
  // Dimensions(창 전체)로 가정하면 카드 안에 들어갈 때 어긋난다.
  const [pageWidth, setPageWidth] = useState(width);

  const list = (images || []).filter(Boolean);

  if (list.length === 0) {
    return (
      <View style={[styles.placeholder, { height, backgroundColor: theme.colors.background.secondary }, style]}>
        <MaterialIcons name="directions-car" size={48} color={theme.colors.text.tertiary} />
        <Text style={{ color: theme.colors.text.tertiary, marginTop: 8 }}>이미지 없음</Text>
      </View>
    );
  }

  return (
    <View
      style={[{ height }, style]}
      onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
    >
      {/* PagerView 대신 ScrollView — 네이티브·웹 모두에서 동작한다
          (react-native-pager-view는 웹 미지원) */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / (pageWidth || 1));
          if (i !== page) { setPage(i); }
        }}
        style={styles.pager}
      >
        {list.map((uri, i) => (
          <View key={`${i}-${uri}`} style={[styles.page, { width: pageWidth }]}>
            <CarouselImage uri={uri} />
          </View>
        ))}
      </ScrollView>

      {list.length > 1 && (
        <View style={styles.dots}>
          {list.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? theme.colors.primary.main : theme.colors.border.light },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pager: { flex: 1 },
  page: { flex: 1 },
  image: { width: '100%', height: '100%', borderRadius: 12 },
  imageFallback: { justifyContent: 'center', alignItems: 'center' },
  placeholder: {
    width: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

ImageCarousel.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string),
  height: PropTypes.number,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default ImageCarousel;
