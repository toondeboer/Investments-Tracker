import { createFeature, createReducer, on } from '@ngrx/store';
import { ChatMessage, CaptainInsight } from '../captain.types';
import {
  clearChat,
  loadInsights,
  loadInsightsFailure,
  loadInsightsSuccess,
  sendMessage,
  sendMessageFailure,
  sendMessageSuccess,
} from './captain.actions';

export const featureKey = 'captain';

export interface FeatureState {
  messages: ChatMessage[];
  chatLoading: boolean;
  chatError: string | null;
  insight: CaptainInsight | null;
  insightLoading: boolean;
  insightError: string | null;
}

export const initialState: FeatureState = {
  messages: [],
  chatLoading: false,
  chatError: null,
  insight: null,
  insightLoading: false,
  insightError: null,
};

export const reducer = createReducer(
  initialState,
  // Append the user's message immediately so the thread updates optimistically.
  on(sendMessage, (state, { content }) => ({
    ...state,
    messages: [...state.messages, { role: 'user' as const, content }],
    chatLoading: true,
    chatError: null,
  })),
  on(sendMessageSuccess, (state, { reply }) => ({
    ...state,
    messages: [...state.messages, { role: 'assistant' as const, content: reply }],
    chatLoading: false,
  })),
  on(sendMessageFailure, (state, { error }) => ({
    ...state,
    chatLoading: false,
    chatError: error,
  })),
  on(clearChat, (state) => ({ ...state, messages: [], chatError: null })),

  on(loadInsights, (state) => ({
    ...state,
    insightLoading: true,
    insightError: null,
  })),
  on(loadInsightsSuccess, (state, { insight }) => ({
    ...state,
    insight,
    insightLoading: false,
  })),
  on(loadInsightsFailure, (state, { error }) => ({
    ...state,
    insightLoading: false,
    insightError: error,
  }))
);

export const feature = createFeature({ name: featureKey, reducer });
