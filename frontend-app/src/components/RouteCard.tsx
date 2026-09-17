import { LINE_INFO } from '../constants/lines';
import { formatYen, getFare } from '../constants/fares';
import type { RouteResult, TicketKind, TicketPeriod } from '../types';
import { getStationLabel } from '../data/stations';

interface Props {
  result: RouteResult;
  preferredStations: string[];
  ticketKind: TicketKind;
  period: TicketPeriod;
  selected: boolean;
  onSelect: () => void;
}

export function RouteCard({ result, preferredStations, ticketKind, period, selected, onSelect }: Props) {
  const unmet = preferredStations.filter((station) => !result.satisfied.includes(station));
  const start = result.routeNames[0] ? getStationLabel(result.routeNames[0]) : '未設定';
  const end = result.routeNames.length ? getStationLabel(result.routeNames[result.routeNames.length - 1]) : '未設定';

  return (
    <button className={`route-card ${selected ? 'selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
      <div className="route-card-top">
        <div>
          <span className="fare">{formatYen(getFare(ticketKind, period, result.zone))}</span>
          <span className="zone">{result.zone}区</span>
        </div>
        <span className="match"><strong>{result.satisfied.length}</strong> / {preferredStations.length}駅</span>
      </div>
      <div className="route-endpoints">
        <span>{start}</span><span className="route-arrow">→</span><span>{end}</span>
      </div>
      <div className="line-chain" aria-label="利用路線">
        {result.lines.map((line, index) => (
          <span key={`${line}-${index}`} className="line-chip" style={{ '--line-color': LINE_INFO[line].color } as React.CSSProperties}>
            {LINE_INFO[line].code}<small>{LINE_INFO[line].name}</small>
          </span>
        ))}
        {result.lines.length === 0 && <span className="muted">路線情報なし</span>}
      </div>
      <div className="route-stats">
        <span>定期範囲 {result.stationsCount}駅</span>
        <span>乗換 {result.transfers.length}回</span>
      </div>
      {result.transfers.length > 0 && (
        <p className="transfer-copy">
          {result.transfers.map((transfer) => `${getStationLabel(transfer.station)}（${LINE_INFO[transfer.fromLine].name}→${LINE_INFO[transfer.toLine].name}）`).join('，')}
        </p>
      )}
      {unmet.length > 0 && <p className="unmet">未達成：{unmet.map(getStationLabel).join('，')}</p>}
      <p className="sale-note">発売可否は交通局窓口で最終確認が必要である．</p>
    </button>
  );
}
