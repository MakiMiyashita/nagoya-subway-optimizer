// src/components/Sidebar.js

/**
 * 操作パネルと探索結果を表示するサイドバーコンポーネント
 * @param {Object} props
 * @param {string} props.mode - 現在の選択モード（始点・経由地など）
 * @param {Function} props.setMode - モードを切り替える関数
 * @param {Object} props.selections - 選択された駅のデータ
 * @param {Function} props.setSelections - 選択データを更新する関数
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

      {/* 探索結果表示セクション */}
      {results && results.length > 0 && (
        <div className="result-card">
          <h4 style={{ marginTop: 0, marginBottom: '10px' }}>探索結果</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#451a03' }}>
            {results[activeIndex].route_names.join(" → ")}
          </div>
          <div className="pager">
            <button 
              className="pager-btn" 
              disabled={activeIndex === 0} 
              onClick={() => setActiveIndex(a => a - 1)}
            >
              前へ
            </button>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
              {activeIndex + 1} / {results.length}
            </span>
            <button 
              className="pager-btn" 
              disabled={activeIndex === results.length - 1} 
              onClick={() => setActiveIndex(a => a + 1)}
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;