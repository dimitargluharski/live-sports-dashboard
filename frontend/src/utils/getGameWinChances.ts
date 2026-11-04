import type { HeadToHead, WinChances } from '../types/game';
import { getFormWinProbabilities } from './getFormWinProbabilities';

// Null when neither team has recent form, so the UI can show "N/A" instead of a misleading 50/50.
export function getGameWinChances(headToHead?: HeadToHead | null): WinChances | null {
  const form = headToHead?.form;
  if (!form?.home?.matches?.length && !form?.away?.matches?.length) return null;
  return getFormWinProbabilities(form.home, form.away);
}
