import { createAction, props } from '@ngrx/store';
import { CaptainInsight } from '../captain.types';

// --- Chat ("Ask the Captain") ---------------------------------------------

export const sendMessage = createAction(
  '[Captain] Send Message',
  props<{ content: string; demo?: boolean }>()
);
export const sendMessageSuccess = createAction(
  '[Captain] Send Message Success',
  props<{ reply: string }>()
);
export const sendMessageFailure = createAction(
  '[Captain] Send Message Failure',
  props<{ error: string }>()
);
export const clearChat = createAction('[Captain] Clear Chat');

// --- Dashboard insight (daily-cached) -------------------------------------

export const loadInsights = createAction(
  '[Captain] Load Insights',
  props<{ demo?: boolean }>()
);
export const loadInsightsSuccess = createAction(
  '[Captain] Load Insights Success',
  props<{ insight: CaptainInsight }>()
);
export const loadInsightsFailure = createAction(
  '[Captain] Load Insights Failure',
  props<{ error: string }>()
);
