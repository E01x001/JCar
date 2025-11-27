module.exports = {
  root: true,
  extends: '@react-native',
  env: {
    'jest/globals': true,
  },
  rules: {
    // Prevent console statements in production code
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // React specific rules
    'react/prop-types': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // General code quality
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'prefer-const': 'warn',
    'no-var': 'error',

    // React Native specific
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'off',
    'react-native/no-raw-text': 'off',

    // Best practices
    'eqeqeq': ['warn', 'always'],
    'curly': ['warn', 'all'],
    'no-duplicate-imports': 'error',
  },
};
