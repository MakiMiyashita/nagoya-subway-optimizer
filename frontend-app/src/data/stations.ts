import stationsJson from './stations.json';
import type { StationData } from '../types';

export const STATIONS = stationsJson as Record<string, StationData>;

export const getStationLabel = (stationId: string) => STATIONS[stationId]?.nameJa ?? stationId;

export const STATION_IDS = Object.keys(STATIONS);
