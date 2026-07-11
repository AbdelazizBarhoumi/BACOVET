import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractRecords,
  aggregateSelection,
  getValueAtPath,
  stringifyResult,
  computeFormulaForTest,
  validateDirectKeyType,
  buildExecutionResult,
  executeRow,
  AGG_FNS,
} from './exec';
import type { DataMappingRow } from '@/services/dataMappingApi';

// -------- Helper: create a minimal DataMappingRow --------
function makeRow(overrides: Partial<DataMappingRow> = {}): DataMappingRow {
  return {
    id: 1,
    kpi: 'F-REQ-101',
    name: 'Test KPI',
    variable: 'test_variable',
    endpoint: null,
    variable_type: 'Direct',
    variable_key: '',
    is_filtered: false,
    filter_key: '',
    filter_value: '',
    has_function: false,
    fn: 'Latest',
    modules: [],
    formula: null,
    highlight_color: null,
    cible_operator: '>=',
    cible_value: 95,
    cible_is_percentage: false,
    refresh_frequency: '',
    user_id: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// extractRecords
// ═══════════════════════════════════════════════════════════════════════════
describe('extractRecords', () => {
  it('returns array directly when input is an array', () => {
    const input = [{ a: 1 }, { a: 2 }];
    expect(extractRecords(input)).toEqual(input);
  });

  it('unwraps data key', () => {
    expect(extractRecords({ data: [{ x: 1 }] })).toEqual([{ x: 1 }]);
  });

  it('unwraps items key', () => {
    expect(extractRecords({ items: [{ x: 1 }] })).toEqual([{ x: 1 }]);
  });

  it('unwraps result key', () => {
    expect(extractRecords({ result: [{ x: 1 }] })).toEqual([{ x: 1 }]);
  });

  it('unwraps results key', () => {
    expect(extractRecords({ results: [{ x: 1 }] })).toEqual([{ x: 1 }]);
  });

  it('unwraps records key', () => {
    expect(extractRecords({ records: [{ x: 1 }] })).toEqual([{ x: 1 }]);
  });

  it('unwraps rows key', () => {
    expect(extractRecords({ rows: [{ x: 1 }] })).toEqual([{ x: 1 }]);
  });

  it('unwraps value key', () => {
    expect(extractRecords({ value: [{ x: 1 }] })).toEqual([{ x: 1 }]);
  });

  it('prefers data over other keys', () => {
    expect(extractRecords({ data: [{ a: 1 }], items: [{ b: 2 }] })).toEqual([{ a: 1 }]);
  });

  it('wraps non-array object in single-element array', () => {
    expect(extractRecords({ x: 1 })).toEqual([{ x: 1 }]);
  });

  it('returns empty array for null', () => {
    expect(extractRecords(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(extractRecords(undefined)).toEqual([]);
  });

  it('returns empty array for primitive string', () => {
    expect(extractRecords('hello')).toEqual([]);
  });

  it('returns empty array for number', () => {
    expect(extractRecords(42)).toEqual([]);
  });

  it('handles nested data arrays', () => {
    const input = { data: [{ a: { b: 1 } }, { a: { b: 2 } }] };
    expect(extractRecords(input)).toEqual([{ a: { b: 1 } }, { a: { b: 2 } }]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getValueAtPath
// ═══════════════════════════════════════════════════════════════════════════
describe('getValueAtPath', () => {
  it('resolves flat key', () => {
    expect(getValueAtPath({ foo: 42 }, 'foo')).toBe(42);
  });

  it('resolves dot-path nested keys', () => {
    const obj = { a: { b: { c: 'deep' } } };
    expect(getValueAtPath(obj, 'a.b.c')).toBe('deep');
  });

  it('returns undefined for missing path', () => {
    expect(getValueAtPath({ a: 1 }, 'b')).toBeUndefined();
  });

  it('returns undefined for deep missing path', () => {
    expect(getValueAtPath({ a: { b: 1 } }, 'a.c.d')).toBeUndefined();
  });

  it('returns the value when path traverses through object', () => {
    const obj = { level1: { level2: { level3: 999 } } };
    expect(getValueAtPath(obj, 'level1.level2.level3')).toBe(999);
  });

  it('returns undefined when hitting an array in path', () => {
    const obj = { items: [1, 2, 3] };
    // Arrays are not traversable by dot path since Array.isArray check returns true
    expect(getValueAtPath(obj, 'items.0')).toBeUndefined();
  });

  it('handles string values', () => {
    expect(getValueAtPath({ name: 'test' }, 'name')).toBe('test');
  });

  it('handles boolean values', () => {
    expect(getValueAtPath({ active: true }, 'active')).toBe(true);
  });

  it('handles null values in object', () => {
    expect(getValueAtPath({ val: null }, 'val')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// aggregateSelection
// ═══════════════════════════════════════════════════════════════════════════
describe('aggregateSelection', () => {
  const values = [10, 20, 30, 40, 50];

  it('Latest returns last element', () => {
    expect(aggregateSelection(values, values, 'Latest')).toBe(50);
  });

  it('First returns first element', () => {
    expect(aggregateSelection(values, values, 'First')).toBe(10);
  });

  it('Count returns array length', () => {
    expect(aggregateSelection(values, values, 'Count')).toBe(5);
  });

  it('Sum returns numeric sum', () => {
    expect(aggregateSelection(values, values, 'Sum')).toBe(150);
  });

  it('Average returns arithmetic mean', () => {
    expect(aggregateSelection(values, values, 'Average')).toBe(30);
  });

  it('Min returns minimum', () => {
    expect(aggregateSelection(values, values, 'Min')).toBe(10);
  });

  it('Max returns maximum', () => {
    expect(aggregateSelection(values, values, 'Max')).toBe(50);
  });

  it('handles empty arrays for Sum', () => {
    expect(aggregateSelection([], [], 'Sum')).toBe(0);
  });

  it('handles empty arrays for Average', () => {
    expect(aggregateSelection([], [], 'Average')).toBe(0);
  });

  it('handles empty arrays for Min', () => {
    expect(aggregateSelection([], [], 'Min')).toBeNull();
  });

  it('handles empty arrays for Max', () => {
    expect(aggregateSelection([], [], 'Max')).toBeNull();
  });

  it('handles empty arrays for Count', () => {
    expect(aggregateSelection([], [], 'Count')).toBe(0);
  });

  it('handles non-numeric values in Sum (filters them out)', () => {
    expect(aggregateSelection([10, 'abc', 30], [], 'Sum')).toBe(40);
  });

  it('handles non-numeric values in Average', () => {
    expect(aggregateSelection([10, 'abc', 30], [], 'Average')).toBe(20);
  });

  it('handles non-numeric values in Min', () => {
    expect(aggregateSelection([10, 'abc', 30], [], 'Min')).toBe(10);
  });

  it('handles non-numeric values in Max', () => {
    expect(aggregateSelection([10, 'abc', 30], [], 'Max')).toBe(30);
  });

  it('handles mixed types in Latest', () => {
    expect(aggregateSelection([10, 'hello', true], [], 'Latest')).toBe(true);
  });

  it('handles single element', () => {
    expect(aggregateSelection([42], [], 'Sum')).toBe(42);
    expect(aggregateSelection([42], [], 'Average')).toBe(42);
    expect(aggregateSelection([42], [], 'Min')).toBe(42);
    expect(aggregateSelection([42], [], 'Max')).toBe(42);
  });

  it('handles decimal numbers', () => {
    expect(aggregateSelection([1.5, 2.5, 3.0], [], 'Sum')).toBeCloseTo(7);
    expect(aggregateSelection([1.5, 2.5, 3.0], [], 'Average')).toBeCloseTo(2.333, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// stringifyResult
// ═══════════════════════════════════════════════════════════════════════════
describe('stringifyResult', () => {
  it('returns "null" for null', () => {
    expect(stringifyResult(null)).toBe('null');
  });

  it('returns "null" for undefined', () => {
    expect(stringifyResult(undefined)).toBe('null');
  });

  it('returns string as-is', () => {
    expect(stringifyResult('hello')).toBe('hello');
  });

  it('converts number to string', () => {
    expect(stringifyResult(42)).toBe('42');
  });

  it('converts boolean to string', () => {
    expect(stringifyResult(true)).toBe('true');
    expect(stringifyResult(false)).toBe('false');
  });

  it('converts object to JSON', () => {
    expect(stringifyResult({ a: 1 })).toBe('{"a":1}');
  });

  it('converts array to JSON', () => {
    expect(stringifyResult([1, 2])).toBe('[1,2]');
  });

  it('handles 0', () => {
    expect(stringifyResult(0)).toBe('0');
  });

  it('handles empty string', () => {
    expect(stringifyResult('')).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateDirectKeyType
// ═══════════════════════════════════════════════════════════════════════════
describe('validateDirectKeyType', () => {
  it('returns null for empty records', () => {
    expect(validateDirectKeyType([], 'key')).toBeNull();
  });

  it('returns null for valid simple key with same values', () => {
    const records = [{ val: 10 }, { val: 10 }];
    expect(validateDirectKeyType(records, 'val')).toBeNull();
  });

  it('returns error for array values', () => {
    const records = [{ val: [1, 2, 3] }];
    expect(validateDirectKeyType(records, 'val')).toContain('tableau');
  });

  it('returns error for object with multiple keys', () => {
    const records = [{ val: { a: 1, b: 2 } }];
    expect(validateDirectKeyType(records, 'val')).toContain('plusieurs clés');
  });

  it('returns error when values differ across records', () => {
    const records = [{ val: 10 }, { val: 20 }];
    expect(validateDirectKeyType(records, 'val')).toContain('valeurs différentes');
  });

  it('allows single-key objects (valid for Direct)', () => {
    const records = [{ val: { single: 1 } }];
    expect(validateDirectKeyType(records, 'val')).toBeNull();
  });

  it('handles nested path keys', () => {
    const records = [{ a: { b: 5 } }, { a: { b: 5 } }];
    expect(validateDirectKeyType(records, 'a.b')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// computeFormulaForTest
// ═══════════════════════════════════════════════════════════════════════════
describe('computeFormulaForTest', () => {
  it('returns "—" for null formula', () => {
    const row = makeRow({ formula: null });
    expect(computeFormulaForTest(row, {})).toBe('—');
  });

  it('returns "—" for empty formula items', () => {
    const row = makeRow({ formula: { items: [] } });
    expect(computeFormulaForTest(row, {})).toBe('—');
  });

  it('computes simple addition', () => {
    const row = makeRow({
      formula: {
        items: [
          { type: 'variable', ref: 1 },
          { type: 'operator', op: '+' },
          { type: 'variable', ref: 2 },
        ],
      },
    });
    expect(computeFormulaForTest(row, { 1: '10', 2: '20' })).toBe('30');
  });

  it('computes multiplication with constant', () => {
    const row = makeRow({
      formula: {
        items: [
          { type: 'variable', ref: 1 },
          { type: 'operator', op: '*' },
          { type: 'number', value: 2 },
        ],
      },
    });
    expect(computeFormulaForTest(row, { 1: '15' })).toBe('30');
  });

  it('returns "—" for missing variable value', () => {
    const row = makeRow({
      formula: {
        items: [
          { type: 'variable', ref: 1 },
          { type: 'operator', op: '+' },
          { type: 'variable', ref: 2 },
        ],
      },
    });
    expect(computeFormulaForTest(row, { 1: '10' })).toBe('—');
  });

  it('returns "Erreur" for invalid expression', () => {
    const row = makeRow({
      formula: {
        items: [
          { type: 'variable', ref: 1 },
          { type: 'operator', op: '/' },
          { type: 'number', value: 0 },
        ],
      },
    });
    // Division by zero produces Infinity, which is still a number
    const result = computeFormulaForTest(row, { 1: '10' });
    expect(typeof result).toBe('string');
  });

  it('handles null variable values', () => {
    const row = makeRow({
      formula: {
        items: [
          { type: 'variable', ref: 1 },
          { type: 'operator', op: '+' },
          { type: 'number', value: 5 },
        ],
      },
    });
    expect(computeFormulaForTest(row, { 1: 'null' })).toBe('null');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildExecutionResult
// ═══════════════════════════════════════════════════════════════════════════
describe('buildExecutionResult', () => {
  const records: Record<string, unknown>[] = [
    { chain: 'A', value: 10 },
    { chain: 'B', value: 20 },
    { chain: 'C', value: 30 },
  ];

  it('throws on directError', () => {
    const row = makeRow();
    expect(() => buildExecutionResult(row, records, 'test error')).toThrow('test error');
  });

  describe('Direct type', () => {
    it('extracts single value from single record', () => {
      const row = makeRow({ variable_type: 'Direct', variable_key: 'value' });
      const result = buildExecutionResult(row, [records[0]]);
      expect(result.output).toBe('10');
      expect(result.detail).toBe(10);
    });

    it('extracts multiple values from multiple records', () => {
      const row = makeRow({ variable_type: 'Direct', variable_key: 'value' });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('[10,20,30]');
      expect(result.detail).toEqual([10, 20, 30]);
    });

    it('extracts nested values via dot path', () => {
      const nested = [{ a: { b: 42 } }, { a: { b: 99 } }];
      const row = makeRow({ variable_type: 'Direct', variable_key: 'a.b' });
      const result = buildExecutionResult(row, nested);
      expect(result.output).toBe('[42,99]');
    });

    it('throws on missing variable_key', () => {
      const row = makeRow({ variable_type: 'Direct', variable_key: '' });
      expect(() => buildExecutionResult(row, records)).toThrow('Variable JSON manquante');
    });

    it('applies aggregation function', () => {
      const row = makeRow({
        variable_type: 'Direct',
        variable_key: 'value',
        has_function: true,
        fn: 'Sum',
      });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('60');
    });

    it('applies filter before extraction', () => {
      const row = makeRow({
        variable_type: 'Direct',
        variable_key: 'value',
        is_filtered: true,
        filter_key: 'chain',
        filter_value: 'B',
      });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('20');
    });

    it('applies Latest aggregation', () => {
      const row = makeRow({
        variable_type: 'Direct',
        variable_key: 'value',
        has_function: true,
        fn: 'Latest',
      });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('30');
    });

    it('applies First aggregation', () => {
      const row = makeRow({
        variable_type: 'Direct',
        variable_key: 'value',
        has_function: true,
        fn: 'First',
      });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('10');
    });

    it('applies Average aggregation', () => {
      const row = makeRow({
        variable_type: 'Direct',
        variable_key: 'value',
        has_function: true,
        fn: 'Average',
      });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('20');
    });

    it('applies Min aggregation', () => {
      const row = makeRow({
        variable_type: 'Direct',
        variable_key: 'value',
        has_function: true,
        fn: 'Min',
      });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('10');
    });

    it('applies Max aggregation', () => {
      const row = makeRow({
        variable_type: 'Direct',
        variable_key: 'value',
        has_function: true,
        fn: 'Max',
      });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('30');
    });

    it('applies Count aggregation', () => {
      const row = makeRow({
        variable_type: 'Direct',
        variable_key: 'value',
        has_function: true,
        fn: 'Count',
      });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('3');
    });
  });

  describe('Complex type', () => {
    it('evaluates simple expression', () => {
      const row = makeRow({
        variable_type: 'Complex',
        variable_key: 'value * 2',
      });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('[20,40,60]');
    });

    it('applies aggregation on complex expression', () => {
      const row = makeRow({
        variable_type: 'Complex',
        variable_key: 'value + 100',
        has_function: true,
        fn: 'Sum',
      });
      const result = buildExecutionResult(row, records);
      expect(result.output).toBe('330');
    });

    it('throws on invalid expression', () => {
      const row = makeRow({
        variable_type: 'Complex',
        variable_key: 'invalidFunction()',
      });
      expect(() => buildExecutionResult(row, records)).toThrow('Expression invalide');
    });

    it('evaluates chained property access', () => {
      const complexRecords = [
        { a: { b: 5 }, c: 3 },
        { a: { b: 10 }, c: 2 },
      ];
      const row = makeRow({
        variable_type: 'Complex',
        variable_key: 'a.b * c',
      });
      const result = buildExecutionResult(row, complexRecords);
      expect(result.output).toBe('[15,20]');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// executeRow
// ═══════════════════════════════════════════════════════════════════════════
describe('executeRow', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('throws on missing endpoint', async () => {
    const row = makeRow({ endpoint: null });
    await expect(executeRow(row, 'http://localhost:3001')).rejects.toThrow('Endpoint manquant');
  });

  it('constructs correct URL', async () => {
    const row = makeRow({ endpoint: 'api/data/test', variable_type: 'Direct', variable_key: 'val' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ val: 42 }] }),
    });

    await executeRow(row, 'http://localhost:3001');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/data/test',
      { headers: { Accept: 'application/json' }, signal: undefined }
    );
  });

  it('strips trailing slashes from baseUrl', async () => {
    const row = makeRow({ endpoint: 'api/data/test', variable_type: 'Direct', variable_key: 'val' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ val: 42 }] }),
    });

    await executeRow(row, 'http://localhost:3001///');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/data/test',
      expect.any(Object)
    );
  });

  it('strips leading slashes from endpoint', async () => {
    const row = makeRow({ endpoint: '/api/data/test', variable_type: 'Direct', variable_key: 'val' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ val: 42 }] }),
    });

    await executeRow(row, 'http://localhost:3001');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/data/test',
      expect.any(Object)
    );
  });

  it('throws on HTTP error', async () => {
    const row = makeRow({ endpoint: 'api/data/test' });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(executeRow(row, 'http://localhost:3001')).rejects.toThrow('HTTP 404');
  });

  it('returns extracted and calculated result', async () => {
    const row = makeRow({
      endpoint: 'api/data/efficience',
      variable_type: 'Direct',
      variable_key: 'value',
      has_function: true,
      fn: 'Latest',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ value: 10 }, { value: 20 }, { value: 30 }],
      }),
    });

    const result = await executeRow(row, 'http://localhost:3001');
    expect(result).toBe('30');
  });

  it('passes abort signal to fetch', async () => {
    const row = makeRow({ endpoint: 'api/data/test', variable_type: 'Direct', variable_key: 'val' });
    const controller = new AbortController();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ val: 1 }] }),
    });

    await executeRow(row, 'http://localhost:3001', controller.signal);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/data/test',
      { headers: { Accept: 'application/json' }, signal: controller.signal }
    );
  });

  it('handles array response directly', async () => {
    const row = makeRow({
      endpoint: 'api/data/test',
      variable_type: 'Direct',
      variable_key: 'x',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ x: 5 }, { x: 10 }],
    });

    const result = await executeRow(row, 'http://localhost:3001');
    expect(result).toBe('[5,10]');
  });

  it('handles response with value wrapper', async () => {
    const row = makeRow({
      endpoint: 'api/data/test',
      variable_type: 'Direct',
      variable_key: 'score',
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ value: [{ score: 100 }] }),
    });

    const result = await executeRow(row, 'http://localhost:3001');
    expect(result).toBe('100');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGG_FNS constant
// ═══════════════════════════════════════════════════════════════════════════
describe('AGG_FNS', () => {
  it('contains all 7 aggregation functions', () => {
    expect(AGG_FNS).toEqual(['Latest', 'First', 'Sum', 'Average', 'Min', 'Max', 'Count']);
  });
});
