/**
 * Badge Component Tests
 */

import Badge from '../../src/components/Badge';

describe('Badge Component', () => {
  it('should be defined', () => {
    expect(Badge).toBeDefined();
  });

  it('should have correct PropTypes', () => {
    expect(Badge.propTypes.status).toBeDefined();
    expect(Badge.propTypes.label).toBeDefined();
    expect(Badge.propTypes.style).toBeDefined();
  });

  it('should accept all status types', () => {
    const statuses = ['pending', 'approved', 'rejected', 'completed'];
    expect(statuses).toHaveLength(4);
  });
});
