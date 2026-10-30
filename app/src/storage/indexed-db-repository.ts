import type { CurrencyCountSnapshot } from "../domain/count";
import {
  type CurrencyConfiguration,
  validateCurrencyConfiguration,
} from "../domain/validation";

const DATABASE_VERSION = 1;
const COUNTS_STORE = "counts";
const SETTINGS_STORE = "settings";
const CURRENCY_CONFIGURATIONS_KEY = "currency-configurations";

export interface CountRecord {
  readonly id: string;
  readonly createdAt: string;
  readonly snapshots: readonly CurrencyCountSnapshot[];
  readonly title?: string;
  readonly note?: string;
}

export interface SaveCountInput {
  readonly snapshots: readonly CurrencyCountSnapshot[];
  readonly title?: string;
  readonly note?: string;
}

export interface CountRepository {
  saveCount(input: SaveCountInput): Promise<CountRecord>;
  getCount(id: string): Promise<CountRecord | undefined>;
  listCounts(): Promise<readonly CountRecord[]>;
  getLatestCount(): Promise<CountRecord | undefined>;
  updateCountNote(id: string, note?: string): Promise<CountRecord>;
  deleteCount(id: string): Promise<void>;
  resetAll(): Promise<void>;
}

export interface IndexedDbRepositoryOptions {
  readonly databaseName?: string;
  readonly indexedDB?: IDBFactory;
  readonly now?: () => Date;
  readonly createId?: () => string;
}

interface StoredCurrencyConfigurations {
  readonly key: typeof CURRENCY_CONFIGURATIONS_KEY;
  readonly configurations: readonly CurrencyConfiguration[];
}

interface StoredCountRecord extends CountRecord {
  readonly savedOrder?: number;
}

export class IndexedDbRepository implements CountRepository {
  private readonly databaseName: string;
  private readonly indexedDB: IDBFactory;
  private readonly now: () => Date;
  private readonly createId: () => string;
  private database?: IDBDatabase;
  private opening?: Promise<IDBDatabase>;

  constructor(options: IndexedDbRepositoryOptions = {}) {
    this.databaseName = options.databaseName ?? "cyndy";
    this.indexedDB = options.indexedDB ?? globalThis.indexedDB;
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? (() => globalThis.crypto.randomUUID());

    if (!this.indexedDB) {
      throw new Error("IndexedDB is not available");
    }
  }

  async saveCount(input: SaveCountInput): Promise<CountRecord> {
    validateSnapshots(input.snapshots);
    const id = this.createId();
    if (id.trim().length === 0) {
      throw new TypeError("Count ID is required");
    }

    const record: CountRecord = {
      id,
      createdAt: this.now().toISOString(),
      snapshots: structuredClone(input.snapshots),
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.note === undefined ? {} : { note: input.note }),
    };
    const transaction = (await this.open()).transaction(COUNTS_STORE, "readwrite");
    const store = transaction.objectStore(COUNTS_STORE);
    const existing = await requestResult<StoredCountRecord[]>(store.getAll());
    const savedOrder = existing.reduce(
      (latest, saved) => Math.max(latest, saved.savedOrder ?? 0),
      0,
    ) + 1;
    store.add({ ...record, savedOrder } satisfies StoredCountRecord);
    await transactionComplete(transaction);
    return structuredClone(record);
  }

  async getCount(id: string): Promise<CountRecord | undefined> {
    const transaction = (await this.open()).transaction(COUNTS_STORE, "readonly");
    const request = transaction.objectStore(COUNTS_STORE).get(id);
    const record = await requestResult<StoredCountRecord | undefined>(request);
    await transactionComplete(transaction);
    return record ? toCountRecord(record) : undefined;
  }

  async listCounts(): Promise<readonly CountRecord[]> {
    const transaction = (await this.open()).transaction(COUNTS_STORE, "readonly");
    const records = await requestResult<StoredCountRecord[]>(
      transaction.objectStore(COUNTS_STORE).getAll(),
    );
    await transactionComplete(transaction);
    return records.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
      || (right.savedOrder ?? 0) - (left.savedOrder ?? 0)
      || right.id.localeCompare(left.id))
      .map(toCountRecord);
  }

  async getLatestCount(): Promise<CountRecord | undefined> {
    return (await this.listCounts())[0];
  }

  async updateCountNote(id: string, note?: string): Promise<CountRecord> {
    const transaction = (await this.open()).transaction(COUNTS_STORE, "readwrite");
    const store = transaction.objectStore(COUNTS_STORE);
    const existing = await requestResult<StoredCountRecord | undefined>(store.get(id));
    if (!existing) {
      transaction.abort();
      throw new Error(`Count ${id} was not found`);
    }

    const { note: _previousNote, ...unchanged } = existing;
    const updated: StoredCountRecord = {
      ...unchanged,
      ...(note === undefined ? {} : { note }),
    };
    store.put(updated);
    await transactionComplete(transaction);
    return toCountRecord(updated);
  }

  async deleteCount(id: string): Promise<void> {
    const transaction = (await this.open()).transaction(COUNTS_STORE, "readwrite");
    transaction.objectStore(COUNTS_STORE).delete(id);
    await transactionComplete(transaction);
  }

  async saveCurrencyConfigurations(
    configurations: readonly CurrencyConfiguration[],
  ): Promise<void> {
    if (configurations.length === 0) {
      throw new TypeError("At least one currency configuration is required");
    }
    for (const configuration of configurations) {
      const issue = validateCurrencyConfiguration(configuration)[0];
      if (issue) {
        throw new TypeError(`Invalid currency configuration: ${issue.message}`);
      }
    }

    const value: StoredCurrencyConfigurations = {
      key: CURRENCY_CONFIGURATIONS_KEY,
      configurations: structuredClone(configurations),
    };
    const transaction = (await this.open()).transaction(SETTINGS_STORE, "readwrite");
    transaction.objectStore(SETTINGS_STORE).put(value);
    await transactionComplete(transaction);
  }

  async getCurrencyConfigurations(): Promise<readonly CurrencyConfiguration[]> {
    const transaction = (await this.open()).transaction(SETTINGS_STORE, "readonly");
    const request = transaction.objectStore(SETTINGS_STORE).get(CURRENCY_CONFIGURATIONS_KEY);
    const stored = await requestResult<StoredCurrencyConfigurations | undefined>(request);
    await transactionComplete(transaction);
    return stored?.configurations ?? [];
  }

  async resetAll(): Promise<void> {
    const transaction = (await this.open()).transaction(
      [SETTINGS_STORE, COUNTS_STORE],
      "readwrite",
    );
    transaction.objectStore(SETTINGS_STORE).clear();
    transaction.objectStore(COUNTS_STORE).clear();
    await transactionComplete(transaction);
  }

  close(): void {
    this.database?.close();
    this.database = undefined;
    this.opening = undefined;
  }

  private open(): Promise<IDBDatabase> {
    if (this.database) {
      return Promise.resolve(this.database);
    }
    if (this.opening) {
      return this.opening;
    }

    this.opening = new Promise((resolve, reject) => {
      const request = this.indexedDB.open(this.databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(COUNTS_STORE)) {
          database.createObjectStore(COUNTS_STORE, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
        }
      };
      request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB"));
      request.onblocked = () => reject(new Error("IndexedDB upgrade was blocked"));
      request.onsuccess = () => {
        this.database = request.result;
        this.database.onversionchange = () => this.close();
        resolve(this.database);
      };
    });
    return this.opening;
  }
}

function validateSnapshots(snapshots: readonly CurrencyCountSnapshot[]): void {
  if (snapshots.length === 0) {
    throw new TypeError("At least one currency snapshot is required");
  }

  for (const snapshot of snapshots) {
    if ([snapshot.currencyId, snapshot.name, snapshot.symbol, snapshot.code].some(
      (value) => value.trim().length === 0,
    )) {
      throw new TypeError("Currency snapshot identity is required");
    }
    if (snapshot.entries.length === 0) {
      throw new TypeError("At least one denomination entry is required");
    }

    let subtotal = 0;
    for (const entry of snapshot.entries) {
      const validEntry = Number.isSafeInteger(entry.denomination)
        && entry.denomination > 0
        && Number.isSafeInteger(entry.quantity)
        && entry.quantity >= 0
        && Number.isSafeInteger(entry.total)
        && entry.total === entry.denomination * entry.quantity;
      if (!validEntry) {
        throw new TypeError("Count snapshot contains an invalid entry");
      }
      subtotal += entry.total;
    }
    if (!Number.isSafeInteger(subtotal) || snapshot.subtotal !== subtotal) {
      throw new TypeError("Count snapshot subtotal does not match its entries");
    }
  }
}

function toCountRecord({ savedOrder: _savedOrder, ...record }: StoredCountRecord): CountRecord {
  return structuredClone(record);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}
