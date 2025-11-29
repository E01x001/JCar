/**
 * Card Component Tests
 */

import Card from '../../src/components/Card';

describe('Card Component', () => {
  it('should be defined', () => {
    expect(Card).toBeDefined();
  });

  it('should have correct PropTypes', () => {
    expect(Card.propTypes.children).toBeDefined();
    expect(Card.propTypes.style).toBeDefined();
  });
});
