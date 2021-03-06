/* @flow */

import { get, without } from 'lodash';
import actionTypes from './actionTypes';
import getSimilarActionInQueue from '../utils/getSimilarActionInQueue';
import type {
  FluxAction,
  FluxActionWithPreviousIntent,
  FluxActionForRemoval,
  NetworkState,
} from '../types';

export const initialState = {
  isConnected: true,
  actionQueue: [],
};

function handleOfflineAction(
  state: NetworkState,
  { payload: { prevAction, prevThunk }, meta }: FluxActionWithPreviousIntent,
): NetworkState {
  const isActionToRetry =
    typeof prevAction === 'object' && get(meta, 'retry') === true;

  const isThunkToRetry =
    typeof prevThunk === 'function' && get(prevThunk, 'meta.retry') === true;

  if (isActionToRetry || isThunkToRetry) {
    // If a similar action already existed on the queue, we remove it and push it again to the end of the queue
    const actionToLookUp = prevAction || prevThunk;
    const actionWithMetaData =
      typeof actionToLookUp === 'object'
        ? {
            ...actionToLookUp,
            meta,
          }
        : actionToLookUp;

    const isActionUnique =
      typeof prevAction === 'object' && get(meta, 'unique') === true;

    const isThunkUnique =
      typeof prevThunk === 'function' && get(prevThunk, 'meta.unique') === true;

    let similarActionQueued;
    if (isActionUnique || isThunkUnique) {
      similarActionQueued = getSimilarActionInQueue(
        actionWithMetaData,
        state.actionQueue,
      );
    }

    return {
      ...state,
      actionQueue: similarActionQueued
        ? [
            ...without(state.actionQueue, similarActionQueued),
            actionWithMetaData,
          ]
        : [...state.actionQueue, actionWithMetaData],
    };
  }
  return state;
}

function handleRemoveActionFromQueue(
  state: NetworkState,
  action: FluxActionForRemoval,
): NetworkState {
  const similarActionQueued = getSimilarActionInQueue(
    action,
    state.actionQueue,
  );

  return {
    ...state,
    actionQueue: without(state.actionQueue, similarActionQueued),
  };
}

function handleDismissActionsFromQueue(
  state: NetworkState,
  triggerActionToDismiss: string,
): NetworkState {
  const newActionQueue = state.actionQueue.filter((action: FluxAction) => {
    const dismissArray = get(action, 'meta.dismiss', []);
    return !dismissArray.includes(triggerActionToDismiss);
  });

  return {
    ...state,
    actionQueue: newActionQueue,
  };
}

export default function(
  state: NetworkState = initialState,
  action: *,
): NetworkState {
  switch (action.type) {
    case actionTypes.CONNECTION_CHANGE:
      return {
        ...state,
        isConnected: action.payload,
      };
    case actionTypes.FETCH_OFFLINE_MODE:
      return handleOfflineAction(state, action);
    case actionTypes.REMOVE_FROM_ACTION_QUEUE:
      return handleRemoveActionFromQueue(state, action.payload);
    case actionTypes.DISMISS_ACTIONS_FROM_QUEUE:
      return handleDismissActionsFromQueue(state, action.payload);
    default:
      return state;
  }
}

export function networkSelector(state: { network: NetworkState }) {
  return state.network;
}
