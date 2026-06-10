import { parseInsightNarrative } from './insight-narrative';

describe('parseInsightNarrative', () => {
  it('returns a single neutral segment for plain prose', () => {
    expect(parseInsightNarrative('A calm voyage so far.')).toEqual([
      { text: 'A calm voyage so far.', bold: false, tone: 'neutral' },
    ]);
  });

  it('bolds an unsigned currency total but leaves it untinted', () => {
    expect(parseInsightNarrative('value is **€42,153.34** today')).toEqual([
      { text: 'value is ', bold: false, tone: 'neutral' },
      { text: '€42,153.34', bold: true, tone: 'neutral' },
      { text: ' today', bold: false, tone: 'neutral' },
    ]);
  });

  it('bolds an unsigned allocation percentage but leaves it untinted', () => {
    const segments = parseInsightNarrative('at 83.88% of the fleet');
    expect(segments[1]).toEqual({
      text: '83.88%',
      bold: true,
      tone: 'neutral',
    });
  });

  it('tints a signed gain green and bolds it', () => {
    const segments = parseInsightNarrative('return is +€5,192.08 overall');
    expect(segments).toEqual([
      { text: 'return is ', bold: false, tone: 'neutral' },
      { text: '+€5,192.08', bold: true, tone: 'positive' },
      { text: ' overall', bold: false, tone: 'neutral' },
    ]);
  });

  it('tints a signed loss red and bolds it', () => {
    const segments = parseInsightNarrative('moved -5.01% this week');
    expect(segments[1]).toEqual({
      text: '-5.01%',
      bold: true,
      tone: 'negative',
    });
  });

  it('treats a Unicode minus as a loss', () => {
    const segments = parseInsightNarrative('down −3.82% on the week');
    expect(segments[1].tone).toBe('negative');
    expect(segments[1].bold).toBe(true);
  });

  it('does not swallow a trailing sentence comma', () => {
    const segments = parseInsightNarrative('down €1,430.29, though steady');
    expect(segments[1]).toEqual({
      text: '€1,430.29',
      bold: true,
      tone: 'neutral',
    });
    expect(segments[2].text).toBe(', though steady');
  });

  it('bolds the percentage but leaves the ticker plain', () => {
    const segments = parseInsightNarrative('VUSA.AS at 83.88% allocation');
    expect(segments).toEqual([
      { text: 'VUSA.AS at ', bold: false, tone: 'neutral' },
      { text: '83.88%', bold: true, tone: 'neutral' },
      { text: ' allocation', bold: false, tone: 'neutral' },
    ]);
  });

  it('leaves a bare integer (no currency or %) untouched', () => {
    expect(parseInsightNarrative('spread across 3 holdings')).toEqual([
      { text: 'spread across 3 holdings', bold: false, tone: 'neutral' },
    ]);
  });

  it('ignores a hyphen inside a date range', () => {
    expect(parseInsightNarrative('over 2020-2021 it grew')).toEqual([
      { text: 'over 2020-2021 it grew', bold: false, tone: 'neutral' },
    ]);
  });

  it('picks both figures out of a parenthetical return', () => {
    const segments = parseInsightNarrative('return **+€5,192.08 (+13.87%)**');
    expect(segments.filter((s) => s.bold).map((s) => s.text)).toEqual([
      '+€5,192.08',
      '+13.87%',
    ]);
    expect(segments.filter((s) => s.bold).every((s) => s.tone === 'positive'));
    expect(segments.every((s) => !s.text.includes('*'))).toBe(true);
  });

  it('handles an empty narrative', () => {
    expect(parseInsightNarrative('')).toEqual([]);
  });
});
