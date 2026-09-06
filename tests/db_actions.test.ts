/**
 * @jest-environment node
 */
jest.mock('../src/lib/redis', () => ({
  redis: {
    del: jest.fn().mockResolvedValue(1)
  }
}));

import { getDatabaseProviderStatus, switchDatabaseProvider } from '@/lib/db/actions';
import { resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';

describe('Database Provider Actions', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('reads current provider and switches between sqlite and supabase', async () => {
    let status = await getDatabaseProviderStatus();
    expect(status.provider).toBe('sqlite');

    await switchDatabaseProvider('supabase');
    status = await getDatabaseProviderStatus();
    expect(status.provider).toBe('supabase');

    await switchDatabaseProvider('sqlite');
    status = await getDatabaseProviderStatus();
    expect(status.provider).toBe('sqlite');
  });
});
