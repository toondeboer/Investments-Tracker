import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FeatureState, featureKey } from './captain.reducer';

export const selectFeature = createFeatureSelector<FeatureState>(featureKey);

export const selectMessages = createSelector(
  selectFeature,
  (state) => state.messages
);

export const selectChatLoading = createSelector(
  selectFeature,
  (state) => state.chatLoading
);

export const selectChatError = createSelector(
  selectFeature,
  (state) => state.chatError
);

export const selectChatQuotaExceeded = createSelector(
  selectFeature,
  (state) => state.chatQuotaExceeded
);

export const selectInsight = createSelector(
  selectFeature,
  (state) => state.insight
);

export const selectInsightLoading = createSelector(
  selectFeature,
  (state) => state.insightLoading
);

export const selectInsightError = createSelector(
  selectFeature,
  (state) => state.insightError
);
