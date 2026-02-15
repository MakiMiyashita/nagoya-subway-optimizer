// src/hooks/useSubwaySolver.js
import { useState } from 'react';
import { fetchOptimalPath } from '../api/solverApi';

/**
 * 地下鉄経路探索の状態とロジックを管理するカスタムフック
 */
export const useSubwaySolver = () => {
  // 1. 状態（State）の定義
  const [mode, setMode] = useState("endpoints");
  const [selections, setSelections] = useState({ endpoints: [], via_hard: [], via_soft: [] });
  const [results, setResults] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);

  // 2. ロジック（Action）の定義
  const toggleStation = (id) => {
    setSelections(prev => {
      const list = prev[mode];
      const newList = list.includes(id) ? list.filter(s => s !== id) : [...list, id];
      return { ...prev, [mode]: newList };
    });
  };

  const clearSelections = () => {
    setSelections({ endpoints: [], via_hard: [], via_soft: [] });
    setResults(null);
    setActiveIndex(0);
  };

  const handleSolve = async () => {
    if (selections.endpoints.length > 2) {
      alert("始点と終点は2箇所まで指定できます。");
      return;
    }

    setIsLoading(true);
    try {
      const resultsData = await fetchOptimalPath(selections.endpoints, selections.via_hard, selections.via_soft);
      setResults(resultsData);
      setActiveIndex(0);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. UIコンポーネントが必要とするデータと関数だけを返す
  return {
    mode, setMode,
    selections, toggleStation, clearSelections,
    results, activeIndex, setActiveIndex,
    handleSolve,
    isLoading
  };
};