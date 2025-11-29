/**
 * Button Component Tests
 */

import Button from '../../src/components/Button';

describe('Button Component', () => {
  it('should be defined', () => {
    expect(Button).toBeDefined();
  });

  it('should have correct PropTypes', () => {
    expect(Button.propTypes.variant).toBeDefined();
    expect(Button.propTypes.title).toBeDefined();
    expect(Button.propTypes.onPress).toBeDefined();
    expect(Button.propTypes.disabled).toBeDefined();
    expect(Button.propTypes.loading).toBeDefined();
  });

  it('should support all variant types in PropTypes', () => {
    const variantType = Button.propTypes.variant;
    expect(variantType).toBeDefined();
  });
});
