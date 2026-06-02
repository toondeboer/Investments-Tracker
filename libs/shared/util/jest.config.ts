/* eslint-disable */
// Run the financial date math under a non-UTC zone so that any regression to
// local-time date handling (these helpers must reason in UTC, because Yahoo
// timestamps and date-only transaction strings are UTC-anchored) is caught by
// CI rather than only surfacing for users outside UTC.
process.env.TZ = 'America/New_York';

export default {
  displayName: 'util',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/shared/util',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
