import type { TicketKind, TicketPeriod } from '../types';

export const TICKET_LABELS: Record<TicketKind, string> = {
  commuter: '通勤',
  university: '大学生',
  student: '中高生',
  child: '小学生以下',
};

export const PERIOD_LABELS: Record<TicketPeriod, string> = {
  '1': '1か月',
  '3': '3か月',
  '6': '6か月',
};

export const FARES: Record<TicketKind, Record<TicketPeriod, number[]>> = {
  commuter: {
    '1': [8540, 9540, 10470, 11300, 12060],
    '3': [24340, 27190, 29840, 32210, 34380],
    '6': [46120, 51520, 56540, 61020, 65130],
  },
  university: {
    '1': [5030, 5500, 5880, 6200, 6440],
    '3': [14340, 15680, 16760, 17670, 18360],
    '6': [27170, 29700, 31760, 33480, 34780],
  },
  student: {
    '1': [4440, 4830, 5140, 5370, 5530],
    '3': [12660, 13770, 14650, 15310, 15770],
    '6': [23980, 26090, 27760, 29000, 29870],
  },
  child: {
    '1': [2400, 2630, 2810, 2960, 3080],
    '3': [6840, 7490, 8010, 8440, 8770],
    '6': [12960, 14180, 15180, 15990, 16610],
  },
};

export const formatYen = (value: number) => `${value.toLocaleString('ja-JP')}円`;

export const getFare = (kind: TicketKind, period: TicketPeriod, zone: number) =>
  FARES[kind][period][zone - 1] ?? 0;
