import { z } from 'zod';
import { DatabaseDto, YahooObject } from './types';

// Runtime validation for data crossing a trust boundary (HTTP responses).
// Without this, a malformed payload is cast to its TypeScript type and flows
// straight into the financial math, where missing fields become NaN money.

// --- DynamoDB API (our backend) -------------------------------------------

const transactionDboSchema = z
  .object({
    ticker: z.string(),
    type: z.string(),
    date: z.string(),
    time: z.string().optional(),
    amount: z.number(),
    value: z.number(),
    currency: z.string(),
  })
  .passthrough();

const transactionsDboSchema = z.object({
  stock: z.array(transactionDboSchema).default([]),
  dividend: z.array(transactionDboSchema).default([]),
  commission: z.array(transactionDboSchema).default([]),
});

const userSettingsDboSchema = z.object({
  baseCurrency: z.string().default('EUR'),
});

const portfolioDboSchema = z.object({
  id: z.string(),
  name: z.string(),
  transactions: transactionsDboSchema,
});

const databaseDtoV2Schema = z.object({
  portfolios: z.array(portfolioDboSchema),
  settings: userSettingsDboSchema,
  schemaVersion: z.literal(2),
});

// v1 shape — used only during migration.
const databaseDtoV1Schema = z
  .object({
    startDate: z.string().optional().default(''),
    transactions: transactionsDboSchema,
  })
  .passthrough();

const EMPTY_TRANSACTIONS = { stock: [], dividend: [], commission: [] };
const EMPTY_V2: DatabaseDto = {
  portfolios: [{ id: 'default', name: 'Default', transactions: EMPTY_TRANSACTIONS }],
  settings: { baseCurrency: 'EUR' },
  schemaVersion: 2,
};

/**
 * Validate the DynamoDB response before it enters the store. Migrates v1
 * payloads (flat transactions) into the v2 multi-portfolio shape transparently.
 * Throws a ZodError on a malformed shape.
 */
export function parseDatabaseDto(raw: unknown): DatabaseDto {
  if (raw === null || raw === undefined || (typeof raw === 'object' && Object.keys(raw as object).length === 0)) {
    return EMPTY_V2;
  }

  const obj = raw as Record<string, unknown>;

  if (obj['schemaVersion'] === 2) {
    return databaseDtoV2Schema.parse(raw) as DatabaseDto;
  }

  // Migrate v1: wrap existing transactions in a "Default" portfolio.
  const v1 = databaseDtoV1Schema.parse(raw);
  return {
    portfolios: [{ id: 'default', name: 'Default', transactions: v1.transactions }],
    settings: { baseCurrency: 'EUR' },
    schemaVersion: 2,
  };
}

// --- Yahoo Finance (external) ---------------------------------------------

const yahooObjectSchema = z.object({
  symbol: z.string(),
  data: z.object({
    chart: z.object({
      result: z
        .array(
          z.object({
            meta: z.object({ currency: z.string(), symbol: z.string() }),
            timestamp: z.array(z.number()),
            events: z
              .object({
                dividends: z.record(
                  z.object({ amount: z.number(), date: z.number() })
                ),
              })
              .optional(),
            indicators: z.object({
              quote: z
                .array(z.object({ close: z.array(z.number().nullable()) }))
                .min(1),
            }),
          })
        )
        .min(1),
    }),
  }),
});

/**
 * Validate the Yahoo Lambda response. Yahoo intermittently returns error
 * objects or partial payloads; rather than crash the whole batch in
 * yahooObjectToTicker, keep only the entries matching the expected shape.
 * Throws only when the payload isn't an array at all.
 */
export function parseYahooObjects(raw: unknown): YahooObject[] {
  const entries = z.array(z.unknown()).parse(raw);
  const valid: YahooObject[] = [];
  for (const entry of entries) {
    const result = yahooObjectSchema.safeParse(entry);
    if (result.success) {
      valid.push(result.data as YahooObject);
    } else {
      console.warn('Skipping malformed Yahoo response entry');
    }
  }
  return valid;
}
