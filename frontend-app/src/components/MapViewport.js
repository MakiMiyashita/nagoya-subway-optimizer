// src/components/MapViewport.js
import STATIONS from '../data/stations.json';
import { CONNECTIONS } from '../data/adj';

const LINE_COLORS = {
  higashiyama: "#FFB200",
  meijo:       "#9d49c0",
  meiko:       "#a373b7",
  tsurumai:    "#0077C3",
  sakuradori:  "#e13d4a",
  kamiiida:    "#F18698"
};

// ラベル位置計算関数
const getLabelProps = (dir) => {
  const off = 22;
  const map = {
    left:   { dx: -off, dy: 5,       anchor: "end" },
    right:  { dx: off,  dy: 5,       anchor: "start" },
    bottom: { dx: 0,    dy: off + 5, anchor: "middle" },
    top:    { dx: 0,    dy: -off,    anchor: "middle" }
  };
  return map[dir] || map.top;
};

/**
 * 路線図を描画するコンポーネント
 * @param {Object}   props
 * @param {Object}   props.selections    - 現在選択されている駅のIDリスト
 * @param {Array}    props.results       - 経路探索の結果配列
 * @param {number}   props.activeIndex   - 現在表示中の結果インデックス
 * @param {Function} props.toggleStation - 駅をクリックした時の処理
 */

const MapViewport = ({ selections, results, activeIndex, toggleStation }) => {
  return (
    <main className="map-viewport">
      <div className="map-header">
        <h2 style={{margin:0}}>Nagoya Subway Path Optimizer</h2>
      </div>

      <svg viewBox="30 110 800 640" className="subway-map">
        {/* 第1層: 路線図 */}
        {CONNECTIONS.map((conn, idx) => (
          <line 
            key={idx} 
            x1={STATIONS[conn.from]?.x}
            y1={STATIONS[conn.from]?.y}
            x2={STATIONS[conn.to]?.x}
            y2={STATIONS[conn.to]?.y}
            stroke={LINE_COLORS[conn.line]}
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.3" 
          />
        ))}

        {/* 第2層: 探索解の強調 */}
        {results?.[activeIndex]?.route_names.map((id, idx, arr) => {
          if (idx === 0) return null;
          const currentStation = STATIONS[id];
          const prevStation = STATIONS[arr[idx - 1]];
          if (!currentStation || !prevStation) return null;
          return (
            <line 
              key={`path-${idx}`}
              className="route-highlight"
              x1={prevStation.x}
              y1={prevStation.y}
              x2={currentStation.x}
              y2={currentStation.y} 
            />
          );
        })}

        {/* 第3層: 駅アイコンとラベル */}
        {Object.entries(STATIONS).map(([id, data]) => {
          const { dx, dy, anchor } = getLabelProps(data.dir);
          const isSelected = selections.endpoints.includes(id) || selections.via_hard.includes(id) || selections.via_soft.includes(id);
          const nodeColor = selections.endpoints.includes(id) ? "#ef4444" : 
                            selections.via_hard.includes(id) ?  "#3b82f6" : 
                            selections.via_soft.includes(id) ?  "#10b981" : "white";
          return (
            <g 
              key={id}
              onClick={(e) => { e.stopPropagation(); toggleStation(id); }}
              style={{cursor: 'pointer'}}>
              <circle 
                cx={data.x}
                cy={data.y} 
                r={isSelected ? "14" : "12"} 
                fill={nodeColor}
                stroke="#334155"
                strokeWidth="2" />
              <text 
                x={data.x + dx}
                y={data.y + dy}
                textAnchor={anchor}
                className="station-label">
                {data.nameJa}
              </text>
            </g>
          );
        })}
      </svg>
    </main>
  );
};

export default MapViewport;