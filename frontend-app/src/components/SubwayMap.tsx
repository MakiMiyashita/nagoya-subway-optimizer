import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react';
import { CONNECTIONS, getLineBetween } from '../data/network';
import { STATIONS } from '../data/stations';
import { LINE_INFO } from '../constants/lines';
import type { RouteResult, StationRole, StationSelection } from '../types';

const stationEntries = Object.entries(STATIONS);
const INITIAL_VIEW = { x: 25, y: 125, width: 800, height: 610 };

interface Props {
  selections: StationSelection;
  activeRole: StationRole;
  activeRoute?: RouteResult;
  onStationClick: (stationName: string) => void;
}

const roleForStation = (stationId: string, selections: StationSelection) =>
  (Object.keys(selections) as StationRole[]).find((role) => selections[role].includes(stationId));

export function SubwayMap({ selections, activeRole, activeRoute, onStationClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null);
  const [view, setView] = useState(INITIAL_VIEW);
  const [dragged, setDragged] = useState(false);
  const routeEdges = useMemo(() => {
    const edges = new Set<string>();
    activeRoute?.routeNames.slice(0, -1).forEach((from, index) => {
      edges.add([from, activeRoute.routeNames[index + 1]].sort().join('::'));
    });
    return edges;
  }, [activeRoute]);

  const routeStationSet = useMemo(() => new Set(activeRoute?.routeNames ?? []), [activeRoute]);

  const zoom = (factor: number, centerX = view.x + view.width / 2, centerY = view.y + view.height / 2) => {
    const width = Math.min(1000, Math.max(260, view.width * factor));
    const height = width * (INITIAL_VIEW.height / INITIAL_VIEW.width);
    const ratioX = (centerX - view.x) / view.width;
    const ratioY = (centerY - view.y) / view.height;
    setView({ x: centerX - width * ratioX, y: centerY - height * ratioY, width, height });
  };

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = view.x + ((event.clientX - rect.left) / rect.width) * view.width;
    const centerY = view.y + ((event.clientY - rect.top) / rect.height) * view.height;
    zoom(event.deltaY > 0 ? 1.12 : 0.88, centerX, centerY);
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
    setDragged(false);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) setDragged(true);
    setView((current) => ({
      ...current,
      x: dragRef.current!.viewX - (deltaX / rect.width) * current.width,
      y: dragRef.current!.viewY - (deltaY / rect.height) * current.height,
    }));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    window.setTimeout(() => setDragged(false), 0);
  };

  const fitActiveRoute = () => {
    const points = activeRoute?.routeNames.map((stationId) => STATIONS[stationId]).filter(Boolean) ?? [];
    if (points.length < 2) return;
    const xs = points.map((point) => point!.x);
    const ys = points.map((point) => point!.y);
    const width = Math.max(260, Math.max(...xs) - Math.min(...xs) + 160);
    const height = width * (INITIAL_VIEW.height / INITIAL_VIEW.width);
    const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
    const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
    setView({ x: centerX - width / 2, y: centerY - height / 2, width, height });
  };

  const labelScale = view.width / INITIAL_VIEW.width;

  return (
    <section className="map-shell" aria-label="名古屋市営地下鉄の路線図">
      <div className="map-instruction"><strong>{activeRole === 'endpoints' ? '始発・終着' : activeRole === 'via_hard' ? '必須経由' : activeRole === 'via_soft' ? '希望経由' : '通らない'}</strong>として駅を選択中</div>
      <svg
        ref={svgRef}
        className="subway-map"
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <rect x="-300" y="-300" width="1500" height="1400" className="map-background" />
        <g className="network-lines">
          {CONNECTIONS.map((connection) => {
            const from = STATIONS[connection.from];
            const to = STATIONS[connection.to];
            if (!from || !to) return null;
            const key = [connection.from, connection.to].sort().join('::');
            const active = routeEdges.has(key);
            return <line key={`${connection.from}-${connection.to}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={LINE_INFO[connection.line].color} className={active ? 'route-line active' : 'route-line'} />;
          })}
        </g>
        <g className="stations">
          {stationEntries.map(([id, station]) => {
            const role = roleForStation(id, selections);
            const onRoute = routeStationSet.has(id);
            const important = Boolean(role || onRoute || ['名古屋', '栄', '金山', '本山', '今池', '八事'].includes(station.nameJa));
            return (
              <g
                key={id}
                className={`station ${role ?? ''} ${onRoute ? 'on-route' : ''}`}
                transform={`translate(${station.x} ${station.y})`}
                onClick={(event) => { event.stopPropagation(); if (!dragged) onStationClick(id); }}
                role="button"
                tabIndex={0}
                aria-label={`${station.nameJa}を選択`}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onStationClick(id); }}
              >
                {role && <circle r={11 * labelScale} className="role-halo" />}
                <circle r={role ? 6.2 * labelScale : 4.2 * labelScale} className="station-dot" />
                {(important || view.width < 520) && (
                  <text x={8 * labelScale} y={-7 * labelScale} fontSize={13 * labelScale} className="station-label">{station.nameJa}</text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-controls" aria-label="地図操作">
        <button onClick={() => zoom(0.82)} aria-label="拡大">＋</button>
        <button onClick={() => zoom(1.22)} aria-label="縮小">−</button>
        {activeRoute && <button onClick={fitActiveRoute} aria-label="選択中の経路を表示">経路</button>}
        <button onClick={() => setView(INITIAL_VIEW)} aria-label="全体表示">全体</button>
      </div>
    </section>
  );
}
