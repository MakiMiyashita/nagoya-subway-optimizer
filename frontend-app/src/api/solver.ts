import { deriveRouteLines } from '../data/network';
import type { RouteResult, SearchConditions, SearchMeta, SearchResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface RawRouteResult {
  route_ids?: string[];
  routeIds?: string[];
  route_names?: string[];
  routeNames?: string[];
  zone?: number;
  logs?: string[];
  satisfied?: string[];
  score?: number;
  stations_count?: number;
  stationsCount?: number;
}

interface RawSearchResponse {
  results?: RawRouteResult[];
  search?: Partial<SearchMeta> & {
    timed_out?: boolean;
    has_more?: boolean;
    returned_count?: number;
  };
  detail?: string;
}

const normalizeRoute = (route: RawRouteResult, index: number): RouteResult => {
  const routeNames = route.routeNames ?? route.route_names ?? [];
  const routeIds = route.routeIds ?? route.route_ids ?? [];
  const { lines, transfers } = deriveRouteLines(routeNames);

  return {
    id: `${routeIds.join('-') || routeNames.join('-')}-${index}`,
    routeIds,
    routeNames,
    zone: route.zone ?? 0,
    logs: route.logs ?? [],
    satisfied: route.satisfied ?? [],
    score: route.score ?? 0,
    stationsCount: route.stationsCount ?? route.stations_count ?? routeNames.length,
    lines,
    transfers,
  };
};

export const searchRoutes = async (
  conditions: SearchConditions,
  signal?: AbortSignal,
): Promise<SearchResponse> => {
  const response = await fetch(`${API_BASE_URL}/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoints: conditions.selections.endpoints,
      via_hard: conditions.selections.via_hard,
      via_soft: conditions.selections.via_soft,
      avoid: conditions.selections.avoid,
      min_budget: conditions.minZone,
      budget: conditions.maxZone,
      max_results: 50,
    }),
    signal,
  });

  const payload = (await response.json()) as RawSearchResponse;
  if (!response.ok) {
    throw new Error(payload.detail || '経路の計算に失敗しました．');
  }

  const results = (payload.results ?? []).map(normalizeRoute);
  const search: SearchMeta = {
    complete: payload.search?.complete ?? true,
    timedOut: payload.search?.timedOut ?? payload.search?.timed_out ?? false,
    hasMore: payload.search?.hasMore ?? payload.search?.has_more ?? false,
    returnedCount: payload.search?.returnedCount ?? payload.search?.returned_count ?? results.length,
  };

  return { results, search };
};
