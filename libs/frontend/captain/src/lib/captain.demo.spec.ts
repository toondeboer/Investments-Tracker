import {
  ADVICE_DEFLECTIONS,
  demoChatReply,
  isAdviceRequest,
} from './captain.demo';

describe('isAdviceRequest', () => {
  it.each([
    'Should I sell NVDA?',
    'should i buy more?',
    'Will the market go up tomorrow?',
    'Whats your forecast for next year?',
    'Is AAPL a good investment?',
    'What do you think I should do?',
  ])('flags advice/forecast prompt: "%s"', (prompt) => {
    expect(isAdviceRequest(prompt)).toBe(true);
  });

  it.each([
    'How did I do this week?',
    'What is my biggest holding?',
    'Explain my dividends',
  ])('does not flag a factual prompt: "%s"', (prompt) => {
    expect(isAdviceRequest(prompt)).toBe(false);
  });
});

describe('demoChatReply', () => {
  it('deflects an advice request with a sailing-themed line', () => {
    const reply = demoChatReply('Should I sell everything?');
    expect(ADVICE_DEFLECTIONS).toContain(reply);
  });

  it('is deterministic for the same prompt', () => {
    const a = demoChatReply('will it crash?');
    const b = demoChatReply('will it crash?');
    expect(a).toBe(b);
  });

  it('answers a known factual prompt about dividends', () => {
    expect(demoChatReply('Explain my dividends').toLowerCase()).toContain(
      'dividend'
    );
  });

  it('falls back to a helpful prompt when nothing matches', () => {
    const reply = demoChatReply('hello there captain');
    expect(reply.length).toBeGreaterThan(0);
  });
});
