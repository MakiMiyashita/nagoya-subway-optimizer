import { useState } from 'react';
import { FARES, PERIOD_LABELS, TICKET_LABELS, formatYen } from '../constants/fares';
import type { SearchConditions, SortKey, StationRole } from '../types';
import type { ResultFilters } from '../utils/results';
import { getStationLabel, STATION_LABELS } from '../data/stations';

const ROLE_LABELS: Record<StationRole, string> = {
  endpoints: '始発・終着',
  via_hard: '必須経由',
  via_soft: '希望経由',
  avoid: '通らない',
};

interface Props {
  conditions: SearchConditions;
  activeRole: StationRole;
  filters: ResultFilters;
  sortKey: SortKey;
  loading: boolean;
  resultCount: number;
  error: string;
  dirty: boolean;
  onConditionsChange: (conditions: SearchConditions) => void;
  onRoleChange: (role: StationRole) => void;
  onRemoveStation: (role: StationRole, station: string) => void;
  onFiltersChange: (filters: ResultFilters) => void;
  onSortChange: (sort: SortKey) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function SearchPanel(props: Props) {
  const [stationFilterFocused, setStationFilterFocused] = useState(false);
  const { conditions } = props;
  const fares = FARES[conditions.ticketKind][conditions.period];
  const update = (patch: Partial<SearchConditions>) => props.onConditionsChange({ ...conditions, ...patch });
  const stationQuery = props.filters.stationQuery.trim();
  const stationSuggestions = stationQuery
    ? STATION_LABELS.filter((stationName) => stationName.includes(stationQuery)).slice(0, 8)
    : [];

  return (
    <div className="search-panel">
      <section>
        <div className="section-heading"><h2>条件を指定</h2><button className="text-button" onClick={props.onReset}>リセット</button></div>
        <div className="field-row">
          <label>定期券種別
            <select value={conditions.ticketKind} onChange={(event) => update({ ticketKind: event.target.value as SearchConditions['ticketKind'] })}>
              {Object.entries(TICKET_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>期間
            <select value={conditions.period} onChange={(event) => update({ period: event.target.value as SearchConditions['period'] })}>
              {Object.entries(PERIOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="field-row">
          <label>予算下限
            <select value={conditions.minZone} onChange={(event) => update({ minZone: Number(event.target.value) })}>
              {fares.map((fare, index) => <option key={fare} value={index + 1}>{index + 1}区・{formatYen(fare)}</option>)}
            </select>
          </label>
          <label>予算上限
            <select value={conditions.maxZone} onChange={(event) => update({ maxZone: Number(event.target.value) })}>
              {fares.map((fare, index) => <option key={fare} value={index + 1}>{index + 1}区・{formatYen(fare)}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section>
        <h2>駅を地図から選択</h2>
        <div className="role-tabs">
          {(Object.keys(ROLE_LABELS) as StationRole[]).map((role) => (
            <button key={role} className={`${role} ${props.activeRole === role ? 'active' : ''}`} onClick={() => props.onRoleChange(role)}>
              {ROLE_LABELS[role]} <span>{conditions.selections[role].length}</span>
            </button>
          ))}
        </div>
        <div className="selection-summary">
          {(Object.keys(ROLE_LABELS) as StationRole[]).map((role) => conditions.selections[role].map((station) => (
            <button key={`${role}-${station}`} className={`station-pill ${role}`} onClick={() => props.onRemoveStation(role, station)} title="選択解除">
              {getStationLabel(station)}<span>×</span>
            </button>
          )))}
          {Object.values(conditions.selections).every((stations) => stations.length === 0) && <p className="empty-copy">役割を選び，地図の駅をタップする．</p>}
        </div>
        {props.error && <p className="error-message" role="alert">{props.error}</p>}
        <button className="primary-button search-button" disabled={props.loading} onClick={props.onSearch}>
          {props.loading ? '候補を計算中…' : props.dirty ? '条件を反映して再検索' : 'この条件で検索'}
        </button>
      </section>

      <section className="result-controls">
        <div className="section-heading"><h2>候補</h2><span>{props.resultCount}件</span></div>
        <label>並び順
          <select value={props.sortKey} onChange={(event) => props.onSortChange(event.target.value as SortKey)}>
            <option value="recommended">おすすめ順</option><option value="satisfaction">希望達成数</option><option value="zone">料金区が低い順</option><option value="stations">駅数が多い順</option>
          </select>
        </label>
        <details>
          <summary>絞り込み</summary>
          <label>この駅を経由
            <span className="station-autocomplete">
              <input
                value={props.filters.stationQuery}
                placeholder="駅名を入力"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={stationFilterFocused && stationSuggestions.length > 0}
                aria-controls="station-filter-suggestions"
                onFocus={() => setStationFilterFocused(true)}
                onBlur={() => setStationFilterFocused(false)}
                onChange={(event) => props.onFiltersChange({ ...props.filters, stationQuery: event.target.value })}
              />
              {stationFilterFocused && stationSuggestions.length > 0 && (
                <span id="station-filter-suggestions" className="station-suggestions" role="listbox">
                  {stationSuggestions.map((stationName) => (
                    <button
                      key={stationName}
                      type="button"
                      role="option"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        props.onFiltersChange({ ...props.filters, stationQuery: stationName });
                        setStationFilterFocused(false);
                      }}
                    >
                      {stationName}
                    </button>
                  ))}
                </span>
              )}
            </span>
          </label>
          <div className="field-row compact">
            <label>希望達成
              <input type="number" min="0" value={props.filters.minSatisfied} onChange={(event) => props.onFiltersChange({ ...props.filters, minSatisfied: Number(event.target.value) })} />
            </label>
            <label>最大料金区
              <input type="number" min="1" max="5" value={props.filters.maxZone} onChange={(event) => props.onFiltersChange({ ...props.filters, maxZone: Number(event.target.value) })} />
            </label>
            <label>最少駅数
              <input type="number" min="0" value={props.filters.minStations} onChange={(event) => props.onFiltersChange({ ...props.filters, minStations: Number(event.target.value) })} />
            </label>
          </div>
        </details>
      </section>
    </div>
  );
}
