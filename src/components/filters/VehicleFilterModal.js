// src/components/filters/VehicleFilterModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';

// 가격 비공개 정책(일반 사용자): 가격 필터/정렬 자체를 노출하지 않는다.
// 가격대 좁히기(이진탐색)로 실가격을 유추할 수 있기 때문 — utils/vehiclePrice.js 참고.
const VehicleFilterModal = ({ visible, onClose, onApply, initialFilters, hidePrice = false }) => {
  const defaultSortBy = hidePrice ? 'year_desc' : 'price_asc';
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    manufacturers: [],
    sortBy: defaultSortBy, // price_asc, price_desc, year_asc, year_desc
  });

  // 주요 제조사 목록
  const manufacturerList = [
    '현대',
    '기아',
    '제네시스',
    '쌍용',
    '르노코리아',
    '쉐보레',
    'BMW',
    '벤츠',
    '아우디',
    '폭스바겐',
    '토요타',
    '렉서스',
    '혼다',
    '닛산',
  ];

  const sortOptions = [
    ...(hidePrice ? [] : [
      { value: 'price_asc', label: '가격 낮은순' },
      { value: 'price_desc', label: '가격 높은순' },
    ]),
    { value: 'year_asc', label: '연식 오래된순' },
    { value: 'year_desc', label: '연식 최신순' },
  ];

  useEffect(() => {
    if (initialFilters) {
      // 비공개 모드면 초기값에 남아있을 수 있는 가격 필터/정렬도 정리
      setFilters(hidePrice
        ? {
            ...initialFilters,
            minPrice: '',
            maxPrice: '',
            sortBy: initialFilters.sortBy?.startsWith('price') ? defaultSortBy : initialFilters.sortBy,
          }
        : initialFilters);
    }
  }, [initialFilters, hidePrice, defaultSortBy]);

  const toggleManufacturer = (manufacturer) => {
    setFilters((prev) => {
      const manufacturers = prev.manufacturers.includes(manufacturer)
        ? prev.manufacturers.filter((m) => m !== manufacturer)
        : [...prev.manufacturers, manufacturer];
      return { ...prev, manufacturers };
    });
  };

  // 비공개 모드에선 가격 관련 값이 어떤 경로로 들어왔어도 걸러서 내보낸다.
  const sanitize = (f) => {
    if (!hidePrice) { return f; }
    return {
      ...f,
      minPrice: '',
      maxPrice: '',
      sortBy: f.sortBy?.startsWith('price') ? defaultSortBy : f.sortBy,
    };
  };

  const handleApply = () => {
    onApply(sanitize(filters));
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      minPrice: '',
      maxPrice: '',
      minYear: '',
      maxYear: '',
      manufacturers: [],
      sortBy: defaultSortBy,
    };
    setFilters(resetFilters);
    onApply(resetFilters);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>필터 & 정렬</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            {/* Price Range — 관리자 전용(가격 비공개 정책) */}
            {!hidePrice && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>가격 범위 (만원)</Text>
                <View style={styles.rangeInputs}>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="최소"
                    keyboardType="numeric"
                    value={filters.minPrice}
                    onChangeText={(text) =>
                      setFilters((prev) => ({ ...prev, minPrice: text }))
                    }
                  />
                  <Text style={styles.rangeSeparator}>~</Text>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="최대"
                    keyboardType="numeric"
                    value={filters.maxPrice}
                    onChangeText={(text) =>
                      setFilters((prev) => ({ ...prev, maxPrice: text }))
                    }
                  />
                </View>
              </View>
            )}

            {/* Year Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>연식 범위</Text>
              <View style={styles.rangeInputs}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="최소"
                  keyboardType="numeric"
                  value={filters.minYear}
                  onChangeText={(text) =>
                    setFilters((prev) => ({ ...prev, minYear: text }))
                  }
                />
                <Text style={styles.rangeSeparator}>~</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="최대"
                  keyboardType="numeric"
                  value={filters.maxYear}
                  onChangeText={(text) =>
                    setFilters((prev) => ({ ...prev, maxYear: text }))
                  }
                />
              </View>
            </View>

            {/* Manufacturers */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>제조사</Text>
              <View style={styles.chipContainer}>
                {manufacturerList.map((manufacturer) => (
                  <TouchableOpacity
                    key={manufacturer}
                    style={[
                      styles.chip,
                      filters.manufacturers.includes(manufacturer) &&
                        styles.chipSelected,
                    ]}
                    onPress={() => toggleManufacturer(manufacturer)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.manufacturers.includes(manufacturer) &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {manufacturer}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>정렬</Text>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.radioOption}
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, sortBy: option.value }))
                  }
                >
                  <Icon
                    name={
                      filters.sortBy === option.value
                        ? 'radio-button-checked'
                        : 'radio-button-unchecked'
                    }
                    size={24}
                    color={filters.sortBy === option.value ? '#007AFF' : '#999'}
                  />
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>초기화</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>적용</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  rangeSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#999',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#f5f5f5',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    backgroundColor: '#007AFF',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default VehicleFilterModal;
