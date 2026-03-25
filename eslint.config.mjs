import wdioEslint from '@wdio/eslint';

export default wdioEslint.config([
  {
    ignores: ['build', 'node_modules', 'bin'],
  },
  {
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/semi': ['error', 'always'],
      'curly': ['error', 'multi-line'],
    },
  },
]);