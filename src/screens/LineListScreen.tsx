// src/screens/LineListScreen.tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { getLines, getStationsByLine } from '../services/api';
import { Line, Station } from '../types';

const TOURIST_SPOTS = [
  {
    id: 't1',
    name: 'ディズニーランド・パリ',
    access: 'RER A線 Marne-la-Vallée – Chessy 駅',
    copyText: 'Marne-la-Vallée – Chessy'
  },
  {
    id: 't2',
    name: 'ヴェルサイユ宮殿',
    access: 'RER C線 Versailles Château Rive Gauche 駅',
    copyText: 'Versailles Château Rive Gauche'
  },
  {
    id: 't3',
    name: 'ルーヴル美術館',
    access: 'メトロ1/7号線 Palais Royal - Musée du Louvre 駅',
    copyText: 'Palais Royal - Musée du Louvre'
  },
  {
    id: 't4',
    name: 'エッフェル塔',
    access: 'RER C線 Champ de Mars / メトロ6号線 Bir-Hakeim 駅',
    copyText: 'Champ de Mars Tour Eiffel'
  },
  {
    id: 't5',
    name: '凱旋門',
    access: 'メトロ1/2/6号線 Charles de Gaulle – Étoile 駅',
    copyText: 'Charles de Gaulle – Étoile'
  },
  {
    id: 't6',
    name: 'モン・サン・ミッシェル',
    access: 'モンパルナス駅からTGV + バス (Mont Saint-Michel)',
    copyText: 'Mont Saint-Michel'
  },
  {
    id: 't7',
    name: 'サクレ・クール寺院',
    access: 'メトロ2号線 Anvers 駅 + ケーブルカー',
    copyText: 'Anvers'
  },
  {
    id: 't8',
    name: 'オペラ座 (ガルニエ宮)',
    access: 'メトロ3/7/8号線 Opéra 駅',
    copyText: 'Opéra'
  },
];

export default function LineListScreen() {
  const [allLines, setAllLines] = useState<Line[]>([]);
  const [filteredLines, setFilteredLines] = useState<Line[]>([]);
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  const [stations, setStations] = useState<Station[]>([]);

  const [loadingLines, setLoadingLines] = useState(true);
  const [loadingStations, setLoadingStations] = useState(false);

  const [activeTab, setActiveTab] = useState<'METRO' | 'RER' | 'TOURIST'>('METRO');

  const getJapaneseLineName = (line: Line | null) => {
    if (!line) return "";
    if (line.category === 'METRO') return `メトロ ${line.code}号線`;
    if (line.category === 'RER') return `RER ${line.code}線`;
    return `${line.mode} ${line.code}`;
  };

  useEffect(() => {
    getLines().then(data => {
      setAllLines(data);
      setLoadingLines(false);
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'TOURIST') return;

    const target = allLines.filter(l => l.category === activeTab);
    setFilteredLines(target);

    if (target.length > 0) {
      handleSelectLine(target[0]);
    } else {
      setSelectedLine(null);
      setStations([]);
    }
  }, [activeTab, allLines]);

  const handleSelectLine = async (line: Line) => {
    setSelectedLine(line);
    setLoadingStations(true);
    const st = await getStationsByLine(line.id);
    setStations(st);
    setLoadingStations(false);
  };

  const copyName = async (name: string) => {
    await Clipboard.setStringAsync(name);
    Alert.alert("コピーしました", `"${name}"`);
  };

  if (loadingLines) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#1A237E" />;
  }

  // 観光スポットリスト描画用コンポーネント
  const renderTouristView = () => (
    <View style={styles.touristContainer}>
      <FlatList
        data={TOURIST_SPOTS}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.touristCard}>
            <View style={styles.touristInfo}>
              <Text style={styles.touristName}>{item.name}</Text>
              <View style={styles.accessRow}>
                <FontAwesome5 name="map-marker-alt" size={14} color="#666" style={{ marginRight: 6 }} />
                <Text style={styles.accessText}>{item.access}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyName(item.copyText)}
            >
              <MaterialIcons name="content-copy" size={20} color="#1A237E" />
              <Text style={styles.copyButtonText}>駅名</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );

  // 通常の路線・駅リスト描画用コンポーネント
  const renderTransportView = () => (
    <View style={styles.content}>
      <View style={styles.leftCol}>
        <FlatList
          data={filteredLines}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.lineItem, selectedLine?.id === item.id && styles.selected]}
              onPress={() => handleSelectLine(item)}
            >
              <View style={[styles.badge, { backgroundColor: `#${item.color}` }]}>
                <Text style={styles.code}>{item.code}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.rightCol}>
        <View style={styles.rightHeader}>
          <Text style={styles.lineNameJa}>
            {getJapaneseLineName(selectedLine)}
          </Text>
        </View>

        {loadingStations ? (
          <ActivityIndicator color="#1A237E" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={stations}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text style={{ padding: 20, color: '#999' }}>駅データがありません</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.stationRow} onPress={() => copyName(item.name)}>
                <Text style={styles.stationName}>{item.name}</Text>
                <View style={styles.copyIcon}>
                  <MaterialIcons name="content-copy" size={16} color="#1A237E" />
                  <Text style={styles.copyText}>コピー</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>路線一覧</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'METRO' && styles.tabButtonActive]}
          onPress={() => setActiveTab('METRO')}
        >
          <Text style={[styles.tabText, activeTab === 'METRO' && styles.tabTextActive]}>メトロ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'RER' && styles.tabButtonActive]}
          onPress={() => setActiveTab('RER')}
        >
          <Text style={[styles.tabText, activeTab === 'RER' && styles.tabTextActive]}>RER</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'TOURIST' && styles.tabButtonActive]}
          onPress={() => setActiveTab('TOURIST')}
        >
          <Text style={[styles.tabText, activeTab === 'TOURIST' && styles.tabTextActive]}>観光スポット</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'TOURIST' ? renderTouristView() : renderTransportView()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1A237E' },

  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabButtonActive: { borderBottomWidth: 3, borderColor: '#1A237E' },
  tabText: { fontSize: 14, color: '#999', fontWeight: 'bold' },
  tabTextActive: { color: '#1A237E' },

  content: { flex: 1, flexDirection: 'row' },

  leftCol: { width: 80, backgroundColor: '#f8f9fa', borderRightWidth: 1, borderColor: '#eee' },
  lineItem: { padding: 16, alignItems: 'center' },
  selected: { backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: '#1A237E' },
  badge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  code: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

  rightCol: { flex: 1, backgroundColor: '#fff' },
  rightHeader: { padding: 16, backgroundColor: '#f0f4f8', borderBottomWidth: 1, borderColor: '#eee' },
  lineNameJa: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  stationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  stationName: { fontSize: 15, color: '#333', flex: 1 },
  copyIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8eaf6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  copyText: { fontSize: 10, color: '#1A237E', marginLeft: 4, fontWeight: 'bold' },

  touristContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  touristCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  touristInfo: { flex: 1, paddingRight: 8 },
  touristName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  accessRow: { flexDirection: 'row', alignItems: 'flex-start' },
  accessText: { fontSize: 13, color: '#666', lineHeight: 18, flex: 1 },
  copyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#e8eaf6',
    borderRadius: 8,
    minWidth: 60,
  },
  copyButtonText: { fontSize: 10, color: '#1A237E', marginTop: 2, fontWeight: 'bold' },
});