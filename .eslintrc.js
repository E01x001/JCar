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

    // Service Modularity Enforcement (Task 88.5)
    // Prevent service files from becoming too large
    'max-lines': ['warn', {
      max: 300,
      skipBlankLines: true,
      skipComments: true,
    }],

    // Limit function complexity to encourage single responsibility
    'complexity': ['warn', { max: 15 }],

    // Keep functions focused and manageable
    'max-lines-per-function': ['warn', {
      max: 100,
      skipBlankLines: true,
      skipComments: true,
    }],

    // Limit function parameters to encourage better design
    'max-params': ['warn', { max: 5 }],
  },
  overrides: [
    {
      // Relax rules for test files
      files: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
      rules: {
        'max-lines': 'off',
        'max-lines-per-function': 'off',
        'complexity': 'off',
      },
    },
    {
      // Relax rules for configuration and script files
      files: ['*.config.js', 'scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        'max-lines': 'off',
      },
    },
    {
      // Existing service files that need gradual refactoring
      files: [
        'src/services/consultation/consultationService.js',
        'src/services/ownershipTransferService.js',
      ],
      rules: {
        'max-lines': ['warn', { max: 600 }], // Temporary higher limit
      },
    },
  ],
};
