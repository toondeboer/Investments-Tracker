import { Ticker, YahooObject } from './types';

export function yahooObjectsToTickers(yahooObjects: YahooObject[]): {
  [ticker: string]: Ticker;
} {
  return yahooObjects.reduce((acc, yahooObject) => {
    acc[yahooObject.symbol] = yahooObjectToTicker(yahooObject);
    return acc;
  }, {} as { [ticker: string]: Ticker });
}

export function yahooObjectToTicker(yahooObject: YahooObject): Ticker {
  const result = yahooObject.data.chart.result[0];
  let dividends: { date: Date; amountPerShare: number }[] = [];
  if (result.events) {
    const dividendEvents = result.events.dividends;
    dividends = Object.keys(dividendEvents).map((key) => ({
      date: new Date(dividendEvents[key].date * 1000),
      amountPerShare: dividendEvents[key].amount,
    }));
  }
  // Defensively align timestamps and closes: Yahoo can return arrays of
  // differing length, which would otherwise pair a price with the wrong day.
  // Trim both to the shorter length so dates[i] always matches values[i].
  const closes = result.indicators.quote[0].close;
  const timestamps = result.timestamp;
  const n = Math.min(timestamps.length, closes.length);

  return {
    name: result.meta.symbol,
    currency: result.meta.currency,
    values: closes.slice(0, n).map((v) => (v === null ? NaN : v)),
    dates: timestamps.slice(0, n).map((time) => new Date(time * 1000)),
    dividends,
  };
}
