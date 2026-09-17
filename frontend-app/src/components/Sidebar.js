// src/components/Sidebar.js

/**
 * 操作パネルと探索結果を表示するサイドバーコンポーネント
 * @param {Object} props
 * @param {string} props.mode - 現在の選択モード（始点・経由地など）
 * @param {Function} props.setMode - モードを切り替える関数
 * @param {Object} props.selections - 選択された駅のデータ
 * @param {Function} props.clearSelections - 選択データを更新する関数
 * @param {Function} props.handleSolve - 探索を実行する関数
 * @param {Array} props.results - 探索結果
 * @param {number} props.activeIndex - 現在表示中の結果インデックス
 * @param {Function} props.setActiveIndex - 表示する結果を切り替える関数
 */
const Sidebar = ({
  mode,
  setMode,
  selections,
  clearSelections,
  handleSolve,
  results,
  activeIndex,
  setActiveIndex,
  isLoading
}) => {
  return (
    <aside className="sidebar">
      {/* 探索設定セクション */}
      <section>
        <h3 style={{ marginBottom: '10px' }}>探索設定</h3>
        <div className="btn-group">
          {[
            { id: 'endpoints', label: '始点・終点', color: '#ef4444' },
            { id: 'via_hard',  label: '必須経由',   color: '#3b82f6' },
            { id: 'via_soft',  label: '優先経由',   color: '#10b981' }
          ].map(item => (
            <button 
              key={item.id} 
              className={`mode-btn ${mode === item.id ? 'active' : ''}`}
              onClick={() => setMode(item.id)}
              style={mode === item.id ? { background: item.color, color: 'white', borderColor: 'transparent' } : {}}
            >
              <span>{item.label}</span>
              <span style={{ opacity: 0.8 }}>{selections[item.id].length}</span>
            </button>
          ))}
        </div>
        <button 
          className="clear-button" 
          style={{ marginTop: '12px', width: '100%', border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
          onClick={clearSelections}
        >
          リセット 🗑️
        </button>
      </section>

      {/* 実行ボタン */}
      <button 
        className="solve-btn" 
        onClick={handleSolve}
        disabled={isLoading}
        style={isLoading ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
      >
        {isLoading ? '経路を探索中... ⏳' : '最短経路を計算 🚀'}
      </button>
      
      {isLoading && (
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '20px' }}>
          <span className="loading-spinner">🔄</span> 最適なルートを計算しています...
        </div>
      )}

      {/* 探索結果表示セクション（リスト表示UI） */}
      {results && results.length > 0 && (
        <div className="results-container" style={{ marginTop: '20px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
            探索結果 ({results.length}件)
          </h4>
          
          {/* リストをスクロール可能にするコンテナ */}
          <div className="results-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
            
            {results.map((route, idx) => {
              // 現在選択されているルートかどうか
              const isActive = activeIndex === idx;

              return (
                <div 
                  key={idx}
                  className="route-card"
                  onClick={() => setActiveIndex(idx)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                    border: isActive ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                    boxShadow: isActive ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
                  }}
                >
                  {/* ヘッダー: ルート番号と区間 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: isActive ? '#1e40af' : '#334155' }}>
                      ルート {idx + 1}
                    </span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1em', color: '#0f172a' }}>
                      {route.zone !== undefined ? `${route.zone}区` : '---'}
                    </span>
                  </div>

                  {/* 経路の要約（始点 → ... → 終点） */}
                  <div style={{ fontSize: '14px', color: '#475569', marginBottom: '6px' }}>
                    <span style={{fontWeight: 'bold'}}>{route.route_names[0]}</span>
                    <span style={{margin: '0 4px'}}>→</span>
                    <span style={{fontSize: '12px', color: '#94a3b8'}}>({route.route_names.length}駅)</span>
                    <span style={{margin: '0 4px'}}>→</span>
                    <span style={{fontWeight: 'bold'}}>{route.route_names[route.route_names.length - 1]}</span>
                  </div>

                  {/* ペナルティやエラーログがある場合の警告表示 */}
                  {route.logs && route.logs.length > 0 && (
                    <div style={{ marginTop: '8px', padding: '6px', backgroundColor: '#fef2f2', borderRadius: '4px', fontSize: '12px', color: '#b91c1c' }}>
                      ⚠️ {route.logs.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;