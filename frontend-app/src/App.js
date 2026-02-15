// src/App.js
import { useSubwaySolver } from './hooks/useSubwaySolver';
import MapViewport from './components/MapViewport';
import Sidebar from './components/Sidebar';
import './styles/App.css';


function App() {
  const {
    mode,
    setMode,
    selections,
    toggleStation,
    clearSelections,
    results,
    activeIndex,
    setActiveIndex,
    handleSolve,
    isLoading
  } = useSubwaySolver();


return (
    <div className="app-container">
      {/* メイン: 路線図描画 */}
      <MapViewport 
        selections={selections}
        results={results}
        activeIndex={activeIndex}
        toggleStation={toggleStation}
      />

      {/* サイドバー: 操作パネル */}
      <Sidebar 
        mode={mode}
        setMode={setMode}
        selections={selections}
        clearSelections={clearSelections}
        handleSolve={handleSolve}
        results={results}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;
