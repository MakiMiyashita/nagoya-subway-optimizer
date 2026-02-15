import axios from 'axios';

const API_BASE_URL = "http://localhost:8000";

/**
 * 経路最適化APIを呼び出す関数
 * @param {Array<string>} endpoints - 始点・終点の駅ID
 * @param {Array<string>} via_hard - 必須経由の駅ID
 * @param {Array<string>} via_soft - 優先経由の駅ID
 * @returns {Promise<Array>} 探索結果の配列
 */

export const fetchOptimalPath = async (endpoints, via_hard, via_soft) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/solve`, {
      endpoints,
      via_hard,
      via_soft,
    });
    return response.data.results;
  } catch (error) {
    console.error("API通信エラー:", error);
    throw new Error("経路の計算に失敗しました。サーバーが起動しているか確認してください。");
  }
};