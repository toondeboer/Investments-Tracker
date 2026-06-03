import { EChartsOption, TooltipComponentOption } from 'echarts';

/**
 * Shared echarts theme for the dashboard charts. Centralises the nautical
 * palette and the tooltip/grid/legend boilerplate that was previously
 * copy-pasted across every chart component. Colours mirror the design tokens
 * in `apps/frontend/tailwind.config.js`.
 */

export const NAUTICAL_TEXT = '#F5F0E8';
export const NAUTICAL_MUTED = '#8FA8C0';
export const NAUTICAL_GOLD = '#C9A84C';
export const NAUTICAL_OCEAN = '#1E6091';
export const NAUTICAL_GRID = 'rgba(201,168,76,0.1)';
export const NAUTICAL_SURFACE = '#0F2035';

/** Multi-series palette (one colour per series), cycled by index. */
export const SERIES_COLORS = [
  '#C9A84C', // antique gold
  '#1E6091', // ocean blue
  '#2ECC71', // success green
  '#E8D5B7', // sand
  '#8FA8C0', // muted blue
  '#E74C3C', // coral red
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Round a number to 2 decimals. */
export const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Format a numeric value for a tooltip: rounded to 2 decimals with an optional
 * currency/unit suffix. Empty string for NaN so hidden points read cleanly.
 */
export function formatMoney(value: number, symbol?: string): string {
  if (value == null || Number.isNaN(value)) {
    return '';
  }
  const rounded = round2(value);
  return symbol ? `${rounded} ${symbol}` : `${rounded}`;
}

/**
 * Readable date label for a time axis / tooltip header. Short spans get the day
 * ("28 Jun 2024"); long spans collapse to month-year ("Jun '24").
 */
export function formatAxisDate(ms: number, spanDays: number): string {
  const d = new Date(ms);
  const month = d.toLocaleString('en-US', { month: 'short' });
  if (spanDays <= 366) {
    return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
  }
  return `${month} '${d.getUTCFullYear().toString().slice(2, 4)}`;
}

/** Span in days between the first and last date of a series (0 if <2 points). */
export function spanDays(dates: Date[]): number {
  if (dates.length < 2) {
    return 0;
  }
  const first = dates[0].getTime();
  const last = dates[dates.length - 1].getTime();
  return Math.abs(last - first) / MS_PER_DAY;
}

type Trigger = 'item' | 'axis';

/** Shared tooltip config (dark surface, gold border, cream text). */
export function baseTooltip(
  trigger: Trigger,
  extra: Partial<TooltipComponentOption> = {}
): TooltipComponentOption {
  return {
    trigger,
    backgroundColor: NAUTICAL_SURFACE,
    borderColor: NAUTICAL_GOLD,
    textStyle: { color: NAUTICAL_TEXT },
    axisPointer: { type: 'shadow' },
    ...extra,
  };
}

/** Tight grid with explicit margins so the plot fills the card. */
export function baseGrid(top: number): EChartsOption['grid'] {
  return {
    top,
    left: 12,
    right: 20,
    bottom: 8,
    containLabel: true,
  };
}

/** Scrollable single-row legend that never wraps into the plot. */
export function scrollLegend(top: number, data?: string[]): EChartsOption['legend'] {
  return {
    type: 'scroll',
    top,
    data,
    textStyle: { color: NAUTICAL_MUTED },
    pageTextStyle: { color: NAUTICAL_MUTED },
    pageIconColor: NAUTICAL_GOLD,
    pageIconInactiveColor: NAUTICAL_GRID,
  };
}

/** Shared chart title config (centred, cream serif-ish heading). */
export function baseTitle(text: string | undefined): EChartsOption['title'] {
  return {
    left: 'center',
    text,
    textStyle: { color: NAUTICAL_TEXT },
  };
}

/** Shared axis line/label/tick styling for a category or value axis. */
export const axisStyle = {
  axisLine: { lineStyle: { color: NAUTICAL_GRID } },
  axisLabel: { color: NAUTICAL_MUTED },
  axisTick: { lineStyle: { color: NAUTICAL_GRID } },
  splitLine: { lineStyle: { color: NAUTICAL_GRID } },
};
