import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      // Keep JSX expressive while allowing Next.js conventions.
      'react/jsx-no-bind': 'off',
    },
  },
];