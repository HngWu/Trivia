import { DatabaseProvider } from './types';
import { SqliteDatabaseProvider } from './sqlite';
import { SupabaseDatabaseProvider } from './supabase';
import { getSqliteDb } from './sqlite-connection';

const sqliteProvider = new SqliteDatabaseProvider();
const supabaseProvider = new SupabaseDatabaseProvider();

let cachedActiveProvider: 'sqlite' | 'supabase' | null = null;

export function clearProviderCache() {
  cachedActiveProvider = null;
}

export function getActiveProviderNameSync(): 'sqlite' | 'supabase' {
  if (cachedActiveProvider) return cachedActiveProvider;

  try {
    const db = getSqliteDb();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'db_provider'").get() as { value: string } | undefined;
    cachedActiveProvider = (row?.value === 'supabase') ? 'supabase' : 'sqlite';
    return cachedActiveProvider;
  } catch (error) {
    console.error('Failed to read db_provider setting, defaulting to sqlite:', error);
    return 'sqlite';
  }
}

export async function getActiveProviderName(): Promise<'sqlite' | 'supabase'> {
  return getActiveProviderNameSync();
}

export async function getDatabase(): Promise<DatabaseProvider> {
  const active = await getActiveProviderName();
  if (active === 'supabase') {
    return supabaseProvider;
  }
  return sqliteProvider;
}

export { sqliteProvider, supabaseProvider };
