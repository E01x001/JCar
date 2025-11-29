/**
 * InputField Component Tests
 */

import InputField from '../../src/components/InputField';

describe('InputField Component', () => {
  it('should be defined', () => {
    expect(InputField).toBeDefined();
  });

  it('should have correct PropTypes', () => {
    expect(InputField.propTypes.value).toBeDefined();
    expect(InputField.propTypes.onChangeText).toBeDefined();
    expect(InputField.propTypes.placeholder).toBeDefined();
    expect(InputField.propTypes.error).toBeDefined();
    expect(InputField.propTypes.label).toBeDefined();
    expect(InputField.propTypes.secureTextEntry).toBeDefined();
  });
});
