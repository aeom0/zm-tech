import nextConfig from 'eslint-config-next'
import nextTypescript from 'eslint-config-next/typescript'

export default [
  ...nextConfig,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]
