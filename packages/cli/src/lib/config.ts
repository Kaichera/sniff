// packages/cli/src/lib/config.ts
import Conf from 'conf';

interface SniffConfig {
  token?: string;
  email?: string;
  apiUrl?: string;
  webUrl?: string;
  debug?: string;
}

export class Config {
  private conf: Conf<SniffConfig>;

  constructor() {
    this.conf = new Conf<SniffConfig>({
      projectName: 'sniff',
    });
  }

  get<K extends keyof SniffConfig>(key: K): SniffConfig[K] {
    // Environment-based config (not persisted)
    if (key === 'apiUrl') {
      return (process.env.SNIFF_API_URL || 'https://api.sniff.to') as SniffConfig[K];
    }
    if (key === 'webUrl') {
      return (process.env.SNIFF_WEB_URL || 'https://sniff.to') as SniffConfig[K];
    }

    return this.conf.get(key);
  }

  set<K extends keyof SniffConfig>(key: K, value: SniffConfig[K]): void {
    this.conf.set(key, value);
  }

  delete(key: keyof SniffConfig): void {
    this.conf.delete(key);
  }

  clear(): void {
    this.conf.clear();
  }

  getAll(): SniffConfig {
    return this.conf.store;
  }
}
