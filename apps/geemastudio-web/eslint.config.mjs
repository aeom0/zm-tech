import nextConfig from 'eslint-config-next'
import nextTypescript from 'eslint-config-next/typescript'

export default [
  ...nextConfig,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Patrones fetch/UI preexistentes; el plugin de React Compiler es demasiado
      // estricto para el código actual de estas apps Next 15.
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]
