import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'public/styles.css'] },
    js.configs.recommended,
    {
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
        rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
    },
];
