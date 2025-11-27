// __tests__/services/vehicleFilterService.test.js

// Mock Firebase modules
jest.mock('@react-native-firebase/firestore');

import firestore from '@react-native-firebase/firestore';
import {
  getFilteredVehicles,
  subscribeToFilteredVehicles,
  isFilterEmpty,
  getActiveFilterCount,
} from '../../src/services/vehicleFilterService';

describe('vehicleFilterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFilteredVehicles', () => {
    it('should fetch vehicles with price filter only', async () => {
      const mockVehicles = [
        { id: '1', price: 1500000, year: 2020, manufacturer: '현대' },
        { id: '2', price: 2000000, year: 2021, manufacturer: '기아' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: mockVehicles.map((v) => ({
          id: v.id,
          data: () => v,
        })),
      });

      const mockOrderBy = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockCollection = jest.fn(() => ({
        where: mockWhere,
        orderBy: mockOrderBy,
        get: mockGet,
      }));

      firestore.mockReturnValue({
        collection: mockCollection,
      });

      const filters = {
        minPrice: '100',
        maxPrice: '300',
        minYear: '',
        maxYear: '',
        manufacturers: [],
        sortBy: 'price_asc',
      };

      const result = await getFilteredVehicles(filters);

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'approved');
      expect(mockWhere).toHaveBeenCalledWith('price', '>=', 1000000);
      expect(mockWhere).toHaveBeenCalledWith('price', '<=', 3000000);
      expect(mockOrderBy).toHaveBeenCalledWith('price', 'asc');
      expect(result).toHaveLength(2);
    });

    it('should apply client-side year filtering', async () => {
      const mockVehicles = [
        { id: '1', price: 1500000, year: 2019, manufacturer: '현대' },
        { id: '2', price: 2000000, year: 2020, manufacturer: '기아' },
        { id: '3', price: 2500000, year: 2021, manufacturer: '현대' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: mockVehicles.map((v) => ({
          id: v.id,
          data: () => v,
        })),
      });

      const mockOrderBy = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockCollection = jest.fn(() => ({
        where: mockWhere,
        orderBy: mockOrderBy,
        get: mockGet,
      }));

      firestore.mockReturnValue({
        collection: mockCollection,
      });

      const filters = {
        minPrice: '',
        maxPrice: '',
        minYear: '2020',
        maxYear: '2021',
        manufacturers: [],
        sortBy: 'price_asc',
      };

      const result = await getFilteredVehicles(filters);

      // Client-side filtering should exclude 2019 vehicle
      expect(result).toHaveLength(2);
      expect(result.every((v) => v.year >= 2020 && v.year <= 2021)).toBe(true);
    });

    it('should apply manufacturer filtering', async () => {
      const mockVehicles = [
        { id: '1', price: 1500000, year: 2020, manufacturer: '현대' },
        { id: '2', price: 2000000, year: 2021, manufacturer: '기아' },
        { id: '3', price: 2500000, year: 2021, manufacturer: '현대' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: mockVehicles.map((v) => ({
          id: v.id,
          data: () => v,
        })),
      });

      const mockOrderBy = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockCollection = jest.fn(() => ({
        where: mockWhere,
        orderBy: mockOrderBy,
        get: mockGet,
      }));

      firestore.mockReturnValue({
        collection: mockCollection,
      });

      const filters = {
        minPrice: '',
        maxPrice: '',
        minYear: '',
        maxYear: '',
        manufacturers: ['현대'],
        sortBy: 'price_asc',
      };

      const result = await getFilteredVehicles(filters);

      // Only 현대 vehicles should be returned
      expect(result).toHaveLength(2);
      expect(result.every((v) => v.manufacturer === '현대')).toBe(true);
    });
  });

  describe('subscribeToFilteredVehicles', () => {
    it('should set up real-time subscription', () => {
      const mockOnSnapshot = jest.fn();
      const mockOrderBy = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockCollection = jest.fn(() => ({
        where: mockWhere,
        orderBy: mockOrderBy,
        onSnapshot: mockOnSnapshot,
      }));

      firestore.mockReturnValue({
        collection: mockCollection,
      });

      const filters = {
        minPrice: '',
        maxPrice: '',
        minYear: '',
        maxYear: '',
        manufacturers: [],
        sortBy: 'price_asc',
      };

      const callback = jest.fn();
      subscribeToFilteredVehicles(filters, callback);

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'approved');
      expect(mockOrderBy).toHaveBeenCalledWith('price', 'asc');
      expect(mockOnSnapshot).toHaveBeenCalled();
    });
  });

  describe('isFilterEmpty', () => {
    it('should return true for default filters', () => {
      const filters = {
        minPrice: '',
        maxPrice: '',
        minYear: '',
        maxYear: '',
        manufacturers: [],
        sortBy: 'price_asc',
      };

      expect(isFilterEmpty(filters)).toBe(true);
    });

    it('should return false when filters are applied', () => {
      const filters = {
        minPrice: '100',
        maxPrice: '',
        minYear: '',
        maxYear: '',
        manufacturers: [],
        sortBy: 'price_asc',
      };

      expect(isFilterEmpty(filters)).toBe(false);
    });
  });

  describe('getActiveFilterCount', () => {
    it('should return 0 for default filters', () => {
      const filters = {
        minPrice: '',
        maxPrice: '',
        minYear: '',
        maxYear: '',
        manufacturers: [],
        sortBy: 'price_asc',
      };

      expect(getActiveFilterCount(filters)).toBe(0);
    });

    it('should count price filter as 1', () => {
      const filters = {
        minPrice: '100',
        maxPrice: '300',
        minYear: '',
        maxYear: '',
        manufacturers: [],
        sortBy: 'price_asc',
      };

      expect(getActiveFilterCount(filters)).toBe(1);
    });

    it('should count all active filters', () => {
      const filters = {
        minPrice: '100',
        maxPrice: '300',
        minYear: '2020',
        maxYear: '2021',
        manufacturers: ['현대', '기아'],
        sortBy: 'year_desc',
      };

      // Price (1) + Year (1) + Manufacturers (1) + Sort (1) = 4
      expect(getActiveFilterCount(filters)).toBe(4);
    });

    it('should not count default sortBy', () => {
      const filters = {
        minPrice: '',
        maxPrice: '',
        minYear: '2020',
        maxYear: '',
        manufacturers: [],
        sortBy: 'price_asc', // default
      };

      // Only year filter
      expect(getActiveFilterCount(filters)).toBe(1);
    });
  });
});
