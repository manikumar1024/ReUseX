// Test environment setup
process.env.AI_MODE = 'mock';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/campusloop_test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';
