const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  transformIgnorePatterns: ["node_modules/(?!(uncrypto|@upstash/redis)/)"],
}
module.exports = createJestConfig(customJestConfig)
