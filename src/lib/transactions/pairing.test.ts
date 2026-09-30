import { describe, expect, it } from 'vitest';
import { pairTransfers, type PairableRow } from './pairing';

const row = (over: Partial<PairableRow> & { id: string }): PairableRow => ({
  date: '2026-09-04', amount: -800, sourceId: 'checking', flow: 'savings', ...over,
});

describe('the ordinary case', () => {
  it('links the two halves of one move', () => {
    const result = pairTransfers([
      row({ id: 'out', date: '2026-09-04', amount: -800, sourceId: 'checking', flow: 'savings' }),
      row({ id: 'in', date: '2026-09-05', amount: 800, sourceId: 'savings', flow: 'transfer' }),
    ]);
    expect(result.pairs).toEqual([{ out: 'out', in: 'in' }]);
    expect(result.ambiguous).toEqual([]);
  });

  it('leaves a leg alone when the other account is not loaded', () => {
    // The ordinary state for a household that has imported one export. Not a
    // problem, and not something to put in a review queue.
    const result = pairTransfers([row({ id: 'out' })]);
    expect(result.pairs).toEqual([]);
    expect(result.ambiguous).toEqual([]);
  });

  it('pairs each of two moves with its own nearer half', () => {
    const result = pairTransfers([
      row({ id: 'out1', date: '2026-09-03', amount: -800 }),
      row({ id: 'out2', date: '2026-09-05', amount: -800 }),
      row({ id: 'in1', date: '2026-09-04', amount: 800, sourceId: 'savings', flow: 'transfer' }),
      row({ id: 'in2', date: '2026-09-06', amount: 800, sourceId: 'savings', flow: 'transfer' }),
    ]);
    expect(result.pairs).toEqual([{ out: 'out1', in: 'in1' }, { out: 'out2', in: 'in2' }]);
    expect(result.ambiguous).toEqual([]);
  });
});

describe('what it refuses', () => {
  it('refuses a tie rather than guessing', () => {
    // Two equal transfers equally close. Pairing either way looks identical
    // and changes what the household believes it saved.
    const result = pairTransfers([
      row({ id: 'out', date: '2026-09-04', amount: -800 }),
      row({ id: 'inA', date: '2026-09-03', amount: 800, sourceId: 'savings', flow: 'transfer' }),
      row({ id: 'inB', date: '2026-09-05', amount: 800, sourceId: 'savings', flow: 'transfer' }),
    ]);
    expect(result.pairs).toEqual([]);
    expect(result.ambiguous.map((a) => a.id).sort()).toEqual(['inA', 'inB', 'out']);
    expect(result.ambiguous[0].reason).toMatch(/rather than guessing/i);
  });

  it('reports each ambiguous leg once, not once per tie', () => {
    const result = pairTransfers([
      row({ id: 'out', date: '2026-09-04', amount: -800 }),
      row({ id: 'inA', date: '2026-09-03', amount: 800, sourceId: 'savings', flow: 'transfer' }),
      row({ id: 'inB', date: '2026-09-05', amount: 800, sourceId: 'savings', flow: 'transfer' }),
    ]);
    expect(new Set(result.ambiguous.map((a) => a.id)).size).toBe(result.ambiguous.length);
  });
});

describe('what it will not pair at all', () => {
  it('will not pair across a gap wider than the window', () => {
    const result = pairTransfers([
      row({ id: 'out', date: '2026-09-01' }),
      row({ id: 'in', date: '2026-09-20', amount: 800, sourceId: 'savings', flow: 'transfer' }),
    ]);
    expect(result.pairs).toEqual([]);
  });

  it('will not pair two legs of the same account', () => {
    const result = pairTransfers([
      row({ id: 'out', sourceId: 'checking' }),
      row({ id: 'in', amount: 800, sourceId: 'checking', flow: 'transfer' }),
    ]);
    expect(result.pairs).toEqual([]);
  });

  it('will not pair amounts that differ by a cent', () => {
    const result = pairTransfers([
      row({ id: 'out', amount: -800 }),
      row({ id: 'in', amount: 800.01, sourceId: 'savings', flow: 'transfer' }),
    ]);
    expect(result.pairs).toEqual([]);
  });

  it('will not pair an expense with an income of the same size', () => {
    // A $2,400 rent payment and a $2,400 paycheck in the same week are a
    // coincidence. Pairing them would delete a real purchase from the totals.
    const result = pairTransfers([
      row({ id: 'rent', amount: -2400, flow: 'expense' }),
      row({ id: 'pay', amount: 2400, sourceId: 'savings', flow: 'income' }),
    ]);
    expect(result.pairs).toEqual([]);
  });

  it('leaves a pair a person set by hand alone', () => {
    const result = pairTransfers([
      row({ id: 'out', lockedBy: 'user' }),
      row({ id: 'in', amount: 800, sourceId: 'savings', flow: 'transfer' }),
    ]);
    expect(result.pairs).toEqual([]);
  });

  it('ignores a row with no source, which cannot be told apart from any other', () => {
    const result = pairTransfers([
      row({ id: 'out', sourceId: null }),
      row({ id: 'in', amount: 800, sourceId: 'savings', flow: 'transfer' }),
    ]);
    expect(result.pairs).toEqual([]);
  });
});

describe('stability', () => {
  it('gives the same answer whatever order the rows arrive in', () => {
    const rows = [
      row({ id: 'out1', date: '2026-09-03' }),
      row({ id: 'out2', date: '2026-09-05' }),
      row({ id: 'in1', date: '2026-09-04', amount: 800, sourceId: 'savings', flow: 'transfer' }),
      row({ id: 'in2', date: '2026-09-06', amount: 800, sourceId: 'savings', flow: 'transfer' }),
    ];
    const forward = pairTransfers(rows);
    const backward = pairTransfers([...rows].reverse());
    expect(backward.pairs).toEqual(forward.pairs);
  });
});
