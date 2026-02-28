export type { BarSearchResult, WhiskeySearchResult } from './database';

export interface SearchParams {
  q: string;
  type: 'bar' | 'whiskey';
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
}

export type SearchType = 'bar' | 'whiskey';
