import { Station, RouteModel, Line } from '../types';

// ==========================================
// 1. Constants & Configuration
// ==========================================
const BASE_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia';
const API_KEY = process.env.EXPO_PUBLIC_PRIM_API_KEY || '';
const HEADERS = { 'apiKey': API_KEY };

// 検索対象とするRER/Transilienの路線コード
const TARGET_TRAIN_CODES = ['A', 'B', 'C', 'D', 'E', 'H', 'J', 'K', 'L', 'N', 'P', 'R', 'U'];

// ==========================================
// 2. Type Definitions for Navitia API
// ==========================================
// アプリ内部の型とは別に、APIから返ってくる生の型を定義して any を回避します
interface NavitiaPlace {
  id: string;
  name: string;
  embedded_type: string;
}

interface NavitiaLine {
  id: string;
  code: string;
  name: string;
  color?: string;
  commercial_mode?: { id: string; name: string };
}

interface NavitiaStopPoint {
  id: string;
  name: string;
  stop_area?: { id: string; name: string };
}

interface NavitiaSection {
  type: string;
  departure_date_time: string;
  arrival_date_time: string;
  duration: number;
  display_informations?: {
    physical_mode?: string;
    code?: string;
    color?: string;
  };
  from?: { name: string };
  to?: { name: string };
}

interface NavitiaJourney {
  departure_date_time: string;
  arrival_date_time: string;
  duration: number;
  sections: NavitiaSection[];
}

// ==========================================
// 3. Utilities & Helpers
// ==========================================

/**
 * Navitiaの日付文字列 (YYYYMMDDTHHMMSS) を Date オブジェクトに変換
 */
const parseNavitiaDate = (str: string): Date => {
  if (!str || str.length < 13) return new Date();
  const y = parseInt(str.substring(0, 4), 10);
  const m = parseInt(str.substring(4, 6), 10) - 1;
  const d = parseInt(str.substring(6, 8), 10);
  const h = parseInt(str.substring(9, 11), 10);
  const min = parseInt(str.substring(11, 13), 10);
  return new Date(y, m, d, h, min);
};

/**
 * 汎用APIクライアント
 */
const fetchNavitia = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  try {
    const res = await fetch(url.toString(), { headers: HEADERS });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    if (json.error) {
      console.error('Navitia API Error Detail:', JSON.stringify(json.error, null, 2));
      throw new Error(json.error.message || 'Unknown API Error');
    }
    return json;
  } catch (e) {
    console.error(`Fetch failed for ${endpoint}:`, e);
    throw e;
  }
};

/**
 * 路線のカテゴリ判定ロジック
 */
const determineLineCategory = (code: string, modeId: string, modeName: string): Line['category'] => {
  if (modeId.includes('Metro') || modeName === 'Metro') return 'METRO';
  if (modeId.includes('RER') || modeName === 'RER') return 'RER';
  if (/^[A-E]$/.test(code)) return 'RER'; // コードがA-EならRER扱い
  return 'OTHER';
};

/**
 * 路線のソートロジック
 */
const sortLines = (a: Line, b: Line): number => {
  // カテゴリが違う場合 (METRO -> RER の順)
  if (a.category !== b.category) return a.category.localeCompare(b.category);

  // RERはアルファベット順
  if (a.category === 'RER') return a.code.localeCompare(b.code);

  // Metroは数値順 (数値変換できない場合は文字順)
  const numA = parseInt(a.code, 10);
  const numB = parseInt(b.code, 10);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;

  return a.code.localeCompare(b.code);
};

// ==========================================
// 4. Exported Functions
// ==========================================

// --- 1. 駅名検索 (Autocomplete) ---
export const searchStations = async (query: string): Promise<Station[]> => {
  if (query.length < 2) return [];

  try {
    const json = await fetchNavitia<{ places: NavitiaPlace[] }>('/places', { q: query });
    return (json.places || [])
      .filter(p => p.embedded_type === 'stop_area')
      .map(p => ({ id: p.id, name: p.name }));
  } catch {
    return [];
  }
};

// --- 2. 経路検索 ---
export const searchRoutes = async (from: string, to: string): Promise<RouteModel[]> => {
  try {
    const json = await fetchNavitia<{ journeys: NavitiaJourney[] }>('/journeys', { from, to });

    return (json.journeys || []).map(j => ({
      departureTime: parseNavitiaDate(j.departure_date_time),
      arrivalTime: parseNavitiaDate(j.arrival_date_time),
      duration: j.duration,
      sections: (j.sections || []).map(s => ({
        type: s.type as "public_transport" | "street_network" | "waiting" | "transfer",
        departureTime: parseNavitiaDate(s.departure_date_time),
        arrivalTime: parseNavitiaDate(s.arrival_date_time),
        duration: s.duration,
        mode: s.display_informations?.physical_mode,
        lineCode: s.display_informations?.code,
        lineColor: s.display_informations?.color,
        fromName: s.from?.name || '',
        toName: s.to?.name || '',
      })),
    }));
  } catch {
    return [];
  }
};

// --- 3. 路線一覧の取得 ---
export const getLines = async (): Promise<Line[]> => {
  console.log('[DEBUG] Fetching Lines...');

  // フィルタ条件の作成
  const metroFilter = 'commercial_mode.id="commercial_mode:Metro"';
  const rerFilter = TARGET_TRAIN_CODES.map(c => `line.code="${c}"`).join(' OR ');

  try {
    // 並列リクエスト
    const [metroData, rerData] = await Promise.all([
      fetchNavitia<{ lines: NavitiaLine[] }>('/lines', { count: '500', filter: metroFilter }),
      fetchNavitia<{ lines: NavitiaLine[] }>('/lines', { count: '500', filter: rerFilter })
    ]);

    const rawLines = [...(metroData.lines || []), ...(rerData.lines || [])];

    // 重複除去 (IDベース)
    const uniqueLinesMap = new Map<string, NavitiaLine>();
    rawLines.forEach(l => uniqueLinesMap.set(l.id, l));

    // データ変換 & カテゴリ分け & フィルタリング
    const processedLines = Array.from(uniqueLinesMap.values())
      .map(l => {
        const code = l.code || "";
        const cModeId = l.commercial_mode?.id || "";
        const cModeName = l.commercial_mode?.name || "";
        const category = determineLineCategory(code, cModeId, cModeName);

        return {
          id: l.id,
          code: code,
          color: l.color || '333333',
          name: l.name || "",
          mode: cModeName || 'Transport',
          category: category,
        } as Line;
      })
      .filter(l => l.category === 'METRO' || l.category === 'RER') // Metro/RERのみ残す
      .sort(sortLines);

    console.log(`[DEBUG] Loaded ${processedLines.length} lines.`);
    return processedLines;

  } catch (e) {
    console.error("[DEBUG] getLines Error:", e);
    return [];
  }
};

// --- 4. 特定路線の駅一覧 ---
export const getStationsByLine = async (lineId: string): Promise<Station[]> => {
  try {
    const json = await fetchNavitia<{ stop_points: NavitiaStopPoint[] }>(`/lines/${lineId}/stop_points`, { count: '500' });

    const uniqueStationsMap = new Map<string, Station>();

    (json.stop_points || []).forEach(sp => {
      // stop_area (駅全体) を優先、なければ stop_point (ホーム等)
      const id = sp.stop_area?.id || sp.id;
      const name = sp.stop_area?.name || sp.name;

      if (id && !uniqueStationsMap.has(id)) {
        uniqueStationsMap.set(id, { id, name });
      }
    });

    return Array.from(uniqueStationsMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

  } catch (e) {
    console.error("getStationsByLine Error:", e);
    return [];
  }
};

// 5. 現在地周辺の駅・バス停を取得
export const getNearbyStations = async (lat: number, lon: number): Promise<Station[]> => {
  // Navitiaの座標指定フォーマットは "lon;lat" (経度;緯度) の順なので注意！
  // distance=500 は半径500m以内 (調整可能)
  const url = `${BASE_URL}/coord/${lon};${lat}/places_nearby?count=10&distance=1000&type[]=stop_area`;

  console.log(`[DEBUG] Fetching nearby: ${url}`);

  try {
    const res = await fetch(url, { headers: HEADERS });
    const json = await res.json();

    if (!json.places_nearby) return [];

    return json.places_nearby.map((p: any) => {
      // stop_area オブジェクトの中に詳細が入っている
      const sa = p.stop_area;
      return {
        id: sa.id,
        name: sa.name,
        // バッジ表示用にモード情報があれば取得 (commercial_modes等)
        // ここでは簡易的に名前だけ返します
      };
    });
  } catch (e) {
    console.error("getNearbyStations Error:", e);
    return [];
  }
};