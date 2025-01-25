import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  verbose: true,
  passWithNoTests: true,
  preset: 'ts-jest',
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  moduleNameMapper: {
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '@/(.*)': '<rootDir>/src/$1', // For TypeScript custom module resolutions
  },
  roots: [
    'src/',
  ],
  testMatch: [
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],
  collectCoverageFrom: [
    '**/*.ts',
    '**/*.tsx',
  ],
  coveragePathIgnorePatterns: [
    'src/helpers/types.ts',
    'src/helpers/constants.ts',
  ],
};

export default config;
