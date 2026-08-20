import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

type Row = Record<string, unknown>;
type TableName = string;
type Database = Record<TableName, Row[]>;

type Filter = (row: Row) => boolean;
type OrderBy = { column: string; ascending: boolean };

type SelectOptions = { count?: 'exact' | 'planned' | 'estimated'; head?: boolean };
type QueryResult = { data: unknown; error: { message: string } | null; count: number | null };

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'local-db.json');

const TABLES = [
  'gyms',
  'users',
  'membership_plans',
  'members',
  'attendance',
  'payments',
  'audit_logs',
  'music_tracks',
  'music_settings',
] as const;

const SUPERADMIN_HASH = '$2b$10$u4ZBfklNc47qi3QL.Z6qL.Qvg496nr.kUdjnqZUi8LC/FH3p8IXRa';

const RELATIONS: Record<string, Record<string, { localKey: string; foreignTable: string; foreignKey: string }>> = {
  attendance: {
    members: { localKey: 'member_id', foreignTable: 'members', foreignKey: 'id' },
  },
  payments: {
    members: { localKey: 'member_id', foreignTable: 'members', foreignKey: 'id' },
    membership_plans: { localKey: 'plan_id', foreignTable: 'membership_plans', foreignKey: 'id' },
  },
  members: {
    membership_plans: { localKey: 'plan_id', foreignTable: 'membership_plans', foreignKey: 'id' },
  },
};

let cache: Database | null = null;
let warned = false;
let writeQueue: Promise<void> = Promise.resolve();

function emptyDb(): Database {
  return Object.fromEntries(TABLES.map((name) => [name, []])) as Database;
}

function nowIso() {
  return new Date().toISOString();
}

function seedSuperAdmin(db: Database) {
  const exists = db.users.some((row) => String(row.username || '').toLowerCase() === 'superadmin');
  if (exists) return;
  db.users.push({
    id: randomUUID(),
    username: 'superadmin',
    password_hash: SUPERADMIN_HASH,
    role: 'SUPER_ADMIN',
    gym_id: null,
    name: 'System Administrator',
    status: 'active',
    password_temp: false,
    password_plain: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
}

function readDb(): Database {
  if (cache) return cache;
  const db = emptyDb();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Database;
      for (const table of TABLES) {
        db[table] = Array.isArray(parsed?.[table]) ? parsed[table] : [];
      }
    }
  } catch (error) {
    console.warn('[local-db] could not read store, starting fresh', error);
  }
  seedSuperAdmin(db);
  cache = db;
  persist(db);
  return db;
}

function persist(db: Database) {
  cache = db;
  writeQueue = writeQueue.then(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  }).catch((error) => {
    console.error('[local-db] failed to persist', error);
  });
}

function likeMatch(value: unknown, pattern: string) {
  const text = value == null ? '' : String(value);
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${escaped}$`, 'i').test(text);
}

function compareValues(left: unknown, op: string, right: unknown) {
  if (op === 'eq') return left === right || String(left) === String(right);
  if (op === 'neq') return left !== right && String(left) !== String(right);
  if (op === 'ilike') return likeMatch(left, String(right));
  const leftNum = left == null ? null : String(left);
  const rightNum = right == null ? null : String(right);
  if (leftNum == null || rightNum == null) return false;
  if (op === 'gte') return leftNum >= rightNum;
  if (op === 'lte') return leftNum <= rightNum;
  if (op === 'gt') return leftNum > rightNum;
  if (op === 'lt') return leftNum < rightNum;
  return false;
}

function parseOrClause(clause: string): Filter {
  const parts = clause.split(/,(?=[A-Za-z_][\w]*\.(eq|neq|ilike|gte|lte|gt|lt)\.)/);
  const filters = parts.map((part) => {
    const match = part.trim().match(/^([A-Za-z_][\w]*)\.(eq|neq|ilike|gte|lte|gt|lt)\.(.*)$/);
    if (!match) return () => false;
    const [, column, op, rawValue] = match;
    return (row: Row) => compareValues(row[column], op, rawValue);
  });
  return (row) => filters.some((filter) => filter(row));
}

function pickColumns(row: Row, columns: string[] | null) {
  if (!columns || columns.includes('*')) return { ...row };
  const picked: Row = {};
  for (const column of columns) {
    picked[column] = row[column];
  }
  return picked;
}

type Embed = { alias: string; table: string; inner: boolean; columns: string[] };

function parseSelect(select: string | undefined) {
  const embeds: Embed[] = [];
  let remaining = select?.trim() || '*';
  remaining = remaining.replace(/(\w+)(!inner)?\(([^)]*)\)/g, (_full, table: string, inner: string | undefined, cols: string) => {
    embeds.push({
      alias: table,
      table,
      inner: Boolean(inner),
      columns: cols.split(',').map((col) => col.trim()).filter(Boolean),
    });
    return '';
  });
  const columns = remaining
    .split(',')
    .map((col) => col.trim())
    .filter(Boolean);
  return { columns: columns.length ? columns : ['*'], embeds };
}

function applyEmbeds(db: Database, table: string, rows: Row[], embeds: Embed[]) {
  if (!embeds.length) return rows;
  const relations = RELATIONS[table] || {};
  const next: Row[] = [];

  for (const row of rows) {
    const copy: Row = { ...row };
    let drop = false;
    for (const embed of embeds) {
      const relation = relations[embed.table];
      if (!relation) {
        copy[embed.alias] = embed.inner ? null : null;
        if (embed.inner) drop = true;
        continue;
      }
      const related = (db[relation.foreignTable] || []).find(
        (candidate) => String(candidate[relation.foreignKey]) === String(row[relation.localKey])
      );
      if (!related) {
        copy[embed.alias] = null;
        if (embed.inner) drop = true;
        continue;
      }
      copy[embed.alias] = pickColumns(related, embed.columns);
    }
    if (!drop) next.push(copy);
  }
  return next;
}

class LocalQuery {
  private table: string;
  private filters: Filter[] = [];
  private orders: OrderBy[] = [];
  private limitCount: number | null = null;
  private selectSpec = '*';
  private selectOptions: SelectOptions = {};
  private mutation: null | { type: 'insert' | 'update' | 'delete' | 'upsert'; payload?: unknown; onConflict?: string } = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: SelectOptions) {
    if (columns) this.selectSpec = columns;
    if (options) this.selectOptions = options;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => compareValues(row[column], 'eq', value));
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => compareValues(row[column], 'neq', value));
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push((row) => compareValues(row[column], 'ilike', value));
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push((row) => compareValues(row[column], 'gte', value));
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push((row) => compareValues(row[column], 'lte', value));
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push((row) => compareValues(row[column], 'gt', value));
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push((row) => compareValues(row[column], 'lt', value));
    return this;
  }

  in(column: string, values: unknown[]) {
    const set = new Set(values.map((value) => String(value)));
    this.filters.push((row) => set.has(String(row[column])));
    return this;
  }

  or(clause: string) {
    this.filters.push(parseOrClause(clause));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  insert(payload: Row | Row[]) {
    this.mutation = { type: 'insert', payload };
    return this;
  }

  update(payload: Row) {
    this.mutation = { type: 'update', payload };
    return this;
  }

  delete() {
    this.mutation = { type: 'delete' };
    return this;
  }

  upsert(payload: Row | Row[], options?: { onConflict?: string }) {
    this.mutation = { type: 'upsert', payload, onConflict: options?.onConflict };
    return this;
  }

  maybeSingle() {
    return this.execute('maybeSingle');
  }

  single() {
    return this.execute('single');
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private applyFilters(rows: Row[]) {
    return rows.filter((row) => this.filters.every((filter) => filter(row)));
  }

  private sortRows(rows: Row[]) {
    if (!this.orders.length) return rows;
    return [...rows].sort((a, b) => {
      for (const order of this.orders) {
        const left = a[order.column];
        const right = b[order.column];
        if (left == null && right == null) continue;
        if (left == null) return order.ascending ? -1 : 1;
        if (right == null) return order.ascending ? 1 : -1;
        if (left === right) continue;
        const cmp = String(left) < String(right) ? -1 : 1;
        return order.ascending ? cmp : -cmp;
      }
      return 0;
    });
  }

  private withDefaults(row: Row) {
    const next = { ...row };
    if (!next.id) next.id = randomUUID();
    if (!next.created_at) next.created_at = nowIso();
    if (!next.updated_at) next.updated_at = nowIso();
    return next;
  }

  private async execute(mode: 'many' | 'single' | 'maybeSingle' = 'many'): Promise<QueryResult> {
    const db = readDb();
    if (!db[this.table]) db[this.table] = [];

    try {
      if (this.mutation?.type === 'insert') {
        const incoming = Array.isArray(this.mutation.payload) ? this.mutation.payload : [this.mutation.payload];
        const inserted = incoming.map((row) => this.withDefaults(row as Row));
        db[this.table].push(...inserted);
        persist(db);
        return this.shape(db, inserted, mode);
      }

      if (this.mutation?.type === 'update') {
        const matched = this.applyFilters(db[this.table]);
        const patch = { ...(this.mutation.payload as Row), updated_at: nowIso() };
        const updated = matched.map((row) => Object.assign(row, patch));
        persist(db);
        return this.shape(db, updated, mode);
      }

      if (this.mutation?.type === 'delete') {
        const remaining: Row[] = [];
        const deleted: Row[] = [];
        for (const row of db[this.table]) {
          if (this.filters.every((filter) => filter(row))) deleted.push(row);
          else remaining.push(row);
        }
        db[this.table] = remaining;
        persist(db);
        return this.shape(db, deleted, mode);
      }

      if (this.mutation?.type === 'upsert') {
        const incoming = Array.isArray(this.mutation.payload) ? this.mutation.payload : [this.mutation.payload];
        const conflictCols = (this.mutation.onConflict || 'id').split(',').map((col) => col.trim()).filter(Boolean);
        const upserted: Row[] = [];
        for (const raw of incoming) {
          const row = this.withDefaults(raw as Row);
          const index = db[this.table].findIndex((existing) =>
            conflictCols.every((col) => String(existing[col]) === String(row[col]))
          );
          if (index >= 0) {
            const merged = { ...db[this.table][index], ...row, id: db[this.table][index].id, updated_at: nowIso() };
            db[this.table][index] = merged;
            upserted.push(merged);
          } else {
            db[this.table].push(row);
            upserted.push(row);
          }
        }
        persist(db);
        return this.shape(db, upserted, mode);
      }

      let rows = this.applyFilters(db[this.table]);
      rows = this.sortRows(rows);
      if (this.limitCount != null) rows = rows.slice(0, this.limitCount);
      return this.shape(db, rows, mode);
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Local database error' },
        count: null,
      };
    }
  }

  private shape(db: Database, rows: Row[], mode: 'many' | 'single' | 'maybeSingle'): QueryResult {
    const { columns, embeds } = parseSelect(this.selectSpec);
    const withEmbeds = applyEmbeds(db, this.table, rows, embeds);
    const count = withEmbeds.length;
    const projected = withEmbeds.map((row) => pickColumns(row, columns));

    if (mode === 'maybeSingle') {
      if (projected.length > 1) {
        return { data: null, error: { message: 'Multiple rows returned' }, count };
      }
      return { data: projected[0] ?? null, error: null, count };
    }

    if (mode === 'single') {
      if (projected.length !== 1) {
        return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' }, count };
      }
      return { data: projected[0], error: null, count };
    }

    if (this.selectOptions.head) {
      return { data: null, error: null, count };
    }

    return { data: projected, error: null, count };
  }
}

export function createLocalServerClient() {
  if (!warned) {
    warned = true;
    console.warn(
      '[local-db] Supabase is not configured. Using file-backed local data at .data/local-db.json so login and admin tools work in development.'
    );
  }
  return {
    from(table: string) {
      return new LocalQuery(table);
    },
  };
}
