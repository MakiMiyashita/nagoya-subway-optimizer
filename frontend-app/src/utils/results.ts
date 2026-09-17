import type { RouteResult, SortKey } from '../types';
import { getStationLabel } from '../data/stations';

export interface ResultFilters {
  minSatisfied: number;
  maxZone: number;
  minStations: number;
  stationQuery: string;
}

export const filterAndSortResults = (
  results: RouteResult[],
  filters: ResultFilters,
  sortKey: SortKey,
) => {
  const query = filters.stationQuery.trim();
  const filtered = results.filter(
    (result) =>
      result.satisfied.length >= filters.minSatisfied &&
      result.zone <= filters.maxZone &&
      result.stationsCount >= filters.minStations &&
      (!query || result.routeNames.some((stationId) => getStationLabel(stationId).includes(query))),
  );

  return [...filtered].sort((a, b) => {
    if (sortKey === 'satisfaction') return b.satisfied.length - a.satisfied.length;
    if (sortKey === 'zone') return a.zone - b.zone;
    if (sortKey === 'stations') return b.stationsCount - a.stationsCount;
    return (
      b.satisfied.length - a.satisfied.length ||
      a.zone - b.zone ||
      b.stationsCount - a.stationsCount
    );
  });
};
