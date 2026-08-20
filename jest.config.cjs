module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  modulePathIgnorePatterns: ['<rootDir>/clav-strats/'],
  testPathIgnorePatterns: ['<rootDir>/clav-strats/'],
  moduleNameMapper: {
    '^react-router/dom$': '<rootDir>/node_modules/react-router/dist/development/dom-export.js',
  },
};
