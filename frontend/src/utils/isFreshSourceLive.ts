import { MAX_SOURCE_STATUS_AGE_MS } from '../constants/app';

export function isFreshSourceLive(sourceIsLive?: boolean, sourceStatusAt?: number, now = Date.now()): boolean {
  return Boolean(sourceIsLive && sourceStatusAt && now - sourceStatusAt <= MAX_SOURCE_STATUS_AGE_MS);
}
