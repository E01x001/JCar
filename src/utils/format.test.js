// src/utils/format.test.js
import { formatPhone, formatPrice } from './format';

describe('format utility functions', () => {
  describe('formatPhone', () => {
    it('should format a 10-digit phone number correctly', () => {
      const result = formatPhone('0101234567');
      expect(result).toBe('010-123-4567');
    });

    it('should format an 11-digit phone number correctly', () => {
      const result = formatPhone('01012345678');
      expect(result).toBe('010-1234-5678');
    });

    it('should return the original value if phone is too short', () => {
      const result = formatPhone('123456');
      expect(result).toBe('123456');
    });

    it('should return the original value if phone is null or undefined', () => {
      expect(formatPhone(null)).toBeNull();
      expect(formatPhone(undefined)).toBeUndefined();
      expect(formatPhone('')).toBe('');
    });
  });

  describe('formatPrice', () => {
    it('should format price in billions (억) correctly', () => {
      const result = formatPrice(250000000);
      expect(result).toBe('2억 5,000만원');
    });

    it('should format price in ten thousands (만) correctly', () => {
      const result = formatPrice(15000000);
      expect(result).toBe('1,500만원');
    });

    it('should handle zero price', () => {
      const result = formatPrice(0);
      expect(result).toBe('0만원');
    });

    it('should handle very large numbers', () => {
      const result = formatPrice(1234567890);
      expect(result).toBe('12억 3,456만원');
    });

    it('should return original value if not a valid number', () => {
      const result = formatPrice('invalid');
      expect(result).toBe('invalid');
    });

    it('should handle price with only billions', () => {
      const result = formatPrice(500000000);
      expect(result).toBe('5억 0만원');
    });
  });
});
