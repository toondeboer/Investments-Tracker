import { createFeature, createReducer, on } from '@ngrx/store';
import { ChatMessage, CaptainInsight, CaptainStatus } from '../captain.types';
import {
  clearChat,
  loadInsights,
  loadInsightsFailure,
  loadInsightsSuccess,
  loadStatusSuccess,
  sendMessage,
  sendMessageFailure,
  sendMessageSuccess,
} from './captain.actions';

export const featureKey = 'captain';

export interface FeatureState {
  messages: ChatMessage[];
  chatLoading: boolean;
  chatError: string | null;
  /** True when the last chat call was rejected for hitting the monthly quota. */
  chatQuotaExceeded: boolean;
  insight: CaptainInsight | null;
  insightLoading: boolean;
  insightError: string | null;
  /** The user's plan + monthly usage; null until first fetched. */
  status: CaptainStatus | null;
}

export const initialState: FeatureState = {
  messages: [],
  chatLoading: false,
  chatError: null,
  chatQuotaExceeded: false,
  insight: null,
  insightLoading: false,
  insightError: null,
  status: null,
};

export const reducer = createReducer(
  initialState,
  // Append the user's message immediately so the thread updates optimistically.
  on(sendMessage, (state, { content }) => ({
    ...state,
    messages: [...state.messages, { role: 'user' as const, content }],
    chatLoading: true,
    chatError: null,
    chatQuotaExceeded: false,
  })),
  on(sendMessageSuccess, (state, { reply, usage }) => ({
    ...state,
    messages: [...state.messages, { role: 'assistant' as const, content: reply }],
    chatLoading: false,
    status: usage ?? state.status,
  })),
  on(sendMessageFailure, (state, { error, quota }) => ({
    ...state,
    chatLoading: false,
    chatError: error,
    chatQuotaExceeded: !!quota,
  })),
  on(clearChat, (state) => ({
    ...state,
    messages: [],
    chatError: null,
    chatQuotaExceeded: false,
  })),

  on(loadInsights, (state) => ({
    ...state,
    insightLoading: true,
    insightError: null,
  })),
  on(loadInsightsSuccess, (state, { insight, usage }) => ({
    ...state,
    insight,
    insightLoading: false,
    status: usage ?? state.status,
  })),
  on(loadInsightsFailure, (state, { error }) => ({
    ...state,
    insightLoading: false,
    insightError: error,
  })),

  on(loadStatusSuccess, (state, { status }) => ({ ...state, status }))
);

export const feature = createFeature({ name: featureKey, reducer });
