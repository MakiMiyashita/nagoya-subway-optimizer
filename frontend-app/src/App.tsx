import { useMemo, useRef, useState } from 'react';
import { getSearchJob, startSearchJob, stopSearchJob } from './api/solver';
import { Onboarding } from './components/Onboarding';
import { RouteCard } from './components/RouteCard';
import { SearchPanel } from './components/SearchPanel';
import { SubwayMap } from './components/SubwayMap';
import { usePersistentConditions } from './hooks/usePersistentConditions';
import type { RouteResult, SearchMeta, SortKey, StationRole } from './types';
import { filterAndSortResults, type ResultFilters } from './utils/results';
import './styles/app-v2.css';

const ONBOARDING_KEY = 'nagoya-subway-onboarding-v1';
const emptyMeta: SearchMeta = {
  complete: true,
  timedOut: false,
  stopped: false,
  hasMore: false,
  returnedCount: 0,
  modelsSeen: 0,
  discoveredCount: 0,
  elapsedSeconds: 0,
};

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export default function App() {
  const { conditions, setConditions, resetConditions } = usePersistentConditions();
  const [activeRole, setActiveRole] = useState<StationRole>('via_soft');
  const [results, setResults] = useState<RouteResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta>(emptyMeta);
  const [activeResultId, setActiveResultId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [progress, setProgress] = useState<SearchMeta>(emptyMeta);
  const activeJobId = useRef<string | undefined>(undefined);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('recommended');
  const [filters, setFilters] = useState<ResultFilters>({ minSatisfied: 0, maxZone: 5, minStations: 0, stationQuery: '' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem(ONBOARDING_KEY) !== 'seen');

  const displayedResults = useMemo(() => filterAndSortResults(results, filters, sortKey), [results, filters, sortKey]);
  const activeRoute = results.find((result) => result.id === activeResultId);
  const positiveStationCount = new Set([
    ...conditions.selections.endpoints,
    ...conditions.selections.via_hard,
    ...conditions.selections.via_soft,
  ]).size;

  const changeConditions = (next: typeof conditions) => {
    let normalized = next;
    if (next.minZone > next.maxZone) normalized = { ...next, minZone: next.maxZone };
    setConditions(normalized);
    if (results.length) setDirty(true);
  };

  const toggleStation = (station: string) => {
    const selections = Object.fromEntries(
      Object.entries(conditions.selections).map(([role, stations]) => [role, stations.filter((item) => item !== station)]),
    ) as typeof conditions.selections;
    const alreadySelected = conditions.selections[activeRole].includes(station);
    if (!alreadySelected) {
      selections[activeRole] = activeRole === 'endpoints'
        ? [...selections[activeRole].slice(-1), station]
        : [...selections[activeRole], station];
    }
    changeConditions({ ...conditions, selections });
  };

  const removeStation = (role: StationRole, station: string) => {
    changeConditions({
      ...conditions,
      selections: { ...conditions.selections, [role]: conditions.selections[role].filter((item) => item !== station) },
    });
  };

  const handleSearch = async () => {
    if (positiveStationCount < 2) {
      setError('始発・終着，必須経由，希望経由の中から，異なる駅を2駅以上選んでください．');
      setSheetOpen(true);
      return;
    }
    setLoading(true);
    setStopping(false);
    setProgress({ ...emptyMeta, complete: false });
    setError('');
    try {
      const jobId = await startSearchJob(conditions);
      activeJobId.current = jobId;
      let job = await getSearchJob(jobId);
      while (job.status === 'running') {
        setProgress(job.response.search);
        await wait(250);
        job = await getSearchJob(jobId);
      }
      if (job.status === 'error') throw new Error(job.error || '経路の計算に失敗しました．');
      setProgress(job.response.search);
      setResults(job.response.results);
      setMeta(job.response.search);
      setActiveResultId(job.response.results[0]?.id);
      setDirty(false);
      setFilters((current) => ({ ...current, maxZone: conditions.maxZone }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '検索中にエラーが発生しました．');
    } finally {
      activeJobId.current = undefined;
      setLoading(false);
      setStopping(false);
    }
  };

  const handleStopSearch = async () => {
    if (!activeJobId.current || stopping) return;
    setStopping(true);
    try {
      await stopSearchJob(activeJobId.current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '探索を中断できませんでした．');
      setStopping(false);
    }
  };

  const handleReset = () => {
    resetConditions();
    setResults([]);
    setMeta(emptyMeta);
    setActiveResultId(undefined);
    setError('');
    setDirty(false);
  };

  const closeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'seen');
    setShowOnboarding(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div><span className="brand-mark">N</span><div><strong>なごや定期ルート</strong><small>欲しい駅から探す地下鉄定期</small></div></div>
        <button className="help-button" onClick={() => setShowOnboarding(true)}>使い方</button>
      </header>
      <main>
        <SubwayMap selections={conditions.selections} activeRole={activeRole} activeRoute={activeRoute} onStationClick={toggleStation} />
        <aside className={`workspace-panel ${sheetOpen ? 'open' : ''}`}>
          <button className="sheet-handle" onClick={() => setSheetOpen(!sheetOpen)} aria-label={sheetOpen ? 'パネルを閉じる' : 'パネルを開く'}><span /></button>
          <SearchPanel
            conditions={conditions}
            activeRole={activeRole}
            filters={filters}
            sortKey={sortKey}
            loading={loading}
            resultCount={displayedResults.length}
            error={error}
            dirty={dirty}
            onConditionsChange={changeConditions}
            onRoleChange={setActiveRole}
            onRemoveStation={removeStation}
            onFiltersChange={setFilters}
            onSortChange={setSortKey}
            onSearch={handleSearch}
            onReset={handleReset}
          />
          {(meta.timedOut || meta.hasMore) && <p className="search-notice">条件が広いため探索を打ち切った．ほかにも候補がある可能性がある．</p>}
          <div className="route-list">
            {displayedResults.map((result) => (
              <RouteCard
                key={result.id}
                result={result}
                preferredStations={conditions.selections.via_soft}
                ticketKind={conditions.ticketKind}
                period={conditions.period}
                selected={result.id === activeResultId}
                onSelect={() => setActiveResultId(result.id)}
              />
            ))}
            {!loading && results.length > 0 && displayedResults.length === 0 && <p className="empty-results">絞り込みに一致する候補がない．</p>}
            {!loading && results.length === 0 && !error && <p className="empty-results">条件を指定して検索すると，ここに候補が並ぶ．</p>}
          </div>
        </aside>
      </main>
      {loading && (
        <div className="search-progress-backdrop" role="dialog" aria-modal="true" aria-labelledby="search-progress-title">
          <div className="search-progress-card">
            <div className="search-animation" aria-hidden="true"><span /><span /><span /></div>
            <p className="eyebrow">ROUTE EXPLORATION</p>
            <h2 id="search-progress-title">定期経路を探索中</h2>
            <p className="discovery-count"><strong>{progress.discoveredCount.toLocaleString()}</strong>件の経路を発見</p>
            <p className="search-progress-detail">{progress.modelsSeen.toLocaleString()}通りを検証済み・{progress.elapsedSeconds.toFixed(1)}秒</p>
            {progress.elapsedSeconds < 6 ? (
              <p className="stop-guidance">6秒後から，現在の候補で探索を終了できる．</p>
            ) : (
              <button className="stop-search-button" disabled={stopping} onClick={handleStopSearch}>
                {stopping ? '探索を中断しています…' : '現在の候補で探索を終了'}
              </button>
            )}
          </div>
        </div>
      )}
      {showOnboarding && <Onboarding onClose={closeOnboarding} />}
    </div>
  );
}
