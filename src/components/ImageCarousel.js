/**
 * ImageCarousel — swipeable vehicle image gallery (Task 127)
 *
 * Renders an array of image URLs as swipeable pages with a dot indicator.
 * Falls back to a placeholder when there are no images.
 */

import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import PagerView from 'react-native-pager-view';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
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
    <View style={[{ height }, style]}>
      <PagerView
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        {list.map((uri, i) => (
          <View key={`${i}-${uri}`} style={styles.page}>
            <CarouselImage uri={uri} />
          </View>
        ))}
      </PagerView>

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
  style: PropTypes.object,
};

export default ImageCarousel;
