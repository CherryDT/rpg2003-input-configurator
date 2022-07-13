module.exports = {
  root: true,
  extends: ['standard'],
  rules: {
    'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 2, maxEOF: 0 }], // See https://github.com/sveltejs/eslint-plugin-svelte3/issues/41
    'import/first': 0 // See https://github.com/sveltejs/eslint-plugin-svelte3/issues/32
  },
  plugins: ['svelte3'],
  overrides: [{ files: ['*.svelte'], processor: 'svelte3/svelte3' }],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020
  },
  env: {
    browser: true,
    es2017: true,
    node: true
  }
}
