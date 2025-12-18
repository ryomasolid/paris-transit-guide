// src/screens/ResultScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { searchRoutes } from '../services/api';
import { RouteModel, Section } from '../types';

export default function ResultScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { from, to } = route.params;
  const [routes, setRoutes] = useState<RouteModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    searchRoutes(from.id, to.id).then(res => {
      setRoutes(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1A237E" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.resultHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>検索結果</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={routes}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => <RouteCard route={item} />}
      />
    </SafeAreaView>
  );
}

const copyToClipboard = async (text: string) => {
  await Clipboard.setStringAsync(text);
  Alert.alert("コピーしました", text);
};

const RouteCard = ({ route }: { route: RouteModel }) => {
  const [expanded, setExpanded] = useState(false);
  const duration = Math.floor(route.duration / 60);

  const visibleSections = route.sections.filter(s => {
    if (s.type === 'waiting') return false;
    const isWalk = s.type === 'street_network' || s.type === 'transfer';
    if (isWalk && s.duration < 60) return false;
    if (!s.mode && !s.lineCode && !isWalk) return false;
    return true;
  });

  const transferCount = Math.max(0, visibleSections.filter(s => s.mode && s.mode !== 'Walking').length - 1);

  return (
    <View style={styles.resultCard}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.cardHeader}>
        <View>
          <Text style={styles.timeLabel}>
            {format(route.departureTime, 'HH:mm')} → {format(route.arrivalTime, 'HH:mm')}
          </Text>
          <Text style={styles.durationLabel}>
            {duration}分 / 乗換{transferCount}回
          </Text>
        </View>
        <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={24} color="#aaa" />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.timeline}>
          {visibleSections.map((s, i) => (
            <SectionRow
              key={i}
              section={s}
              isLast={i === visibleSections.length - 1}
            />
          ))}
          <DestinationRow route={route} />
        </View>
      )}
    </View>
  );
};

const cleanStationName = (name: any) => {
  if (typeof name !== 'string') return "";
  return name
    .replace(/\s*\(Paris\)/gi, '')
    .replace(/\s*\(zone .*\)/gi, '')
    .trim();
};

const SectionRow = ({ section, isLast }: { section: Section, isLast: boolean }) => {
  const [showStops, setShowStops] = useState(false);
  const isWalk = section.type === 'street_network' || section.type === 'transfer';
  const color = section.lineColor ? `#${section.lineColor}` : (isWalk ? '#ccc' : '#1A237E');

  const minutes = Math.ceil(section.duration / 60);

  let badgeText = "";
  if (isWalk) {
    badgeText = `徒歩 ${minutes}分`;
  } else if (section.mode || section.lineCode) {
    const lineInfo = `${section.mode || ""} ${section.lineCode || ""}`.trim();
    badgeText = `${lineInfo} (${minutes}分)`;
  }

  const hasStops = section.stops && section.stops.length > 0;
  const stationName = cleanStationName(section.fromName);

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.timeText}>{format(section.departureTime, 'HH:mm')}</Text>

        <View style={styles.lineCol}>
          <View style={[styles.dot, { borderColor: color }]} />
          <View style={[styles.line, { backgroundColor: color, opacity: isWalk ? 0.3 : 1 }]} />
        </View>

        <View style={styles.infoCol}>
          <TouchableOpacity onPress={() => copyToClipboard(stationName)}>
            <Text style={styles.stationName}>{stationName}</Text>
          </TouchableOpacity>

          <View style={styles.badgeRow}>
            {badgeText !== "" && (
              <View style={styles.badge}>
                <MaterialIcons name={isWalk ? "directions-walk" : "train"} size={12} color="#fff" />
                <Text style={styles.badgeText}>{badgeText}</Text>
              </View>
            )}

            {hasStops && !isWalk && (
              <TouchableOpacity onPress={() => setShowStops(!showStops)} style={styles.stopsBtn}>
                <Text style={styles.stopsBtnText}>{section.stops.length}駅</Text>
                <MaterialIcons name={showStops ? "expand-less" : "expand-more"} size={14} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {showStops && (
        <View style={styles.stopsList}>
          <View style={[styles.lineCol, { position: 'absolute', left: 40, top: 0, bottom: 0 }]}>
            <View style={[styles.line, { backgroundColor: color, top: -10, bottom: -10 }]} />
          </View>

          <View style={{ marginLeft: 60 }}>
            {section.stops.map((stop, idx) => {
              const stopName = cleanStationName(stop.name);
              return (
                <View key={idx} style={styles.stopItem}>
                  <View style={[styles.smallDot, { backgroundColor: color }]} />
                  <TouchableOpacity onPress={() => copyToClipboard(stopName)}>
                    <Text style={styles.stopName}>{stopName}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const DestinationRow = ({ route }: { route: RouteModel }) => {
  if (!route.sections || route.sections.length === 0) return null;
  const lastSection = route.sections[route.sections.length - 1];
  if (!lastSection) return null;

  const destinationName = cleanStationName(lastSection.toName);

  return (
    <View style={styles.row}>
      <Text style={styles.timeText}>{format(route.arrivalTime, 'HH:mm')}</Text>
      <View style={styles.lineCol}>
        <MaterialIcons name="place" size={20} color="#F44336" style={{ marginTop: -2 }} />
      </View>
      <View style={styles.infoCol}>
        <TouchableOpacity onPress={() => copyToClipboard(destinationName)}>
          <Text style={[styles.stationName, { color: '#333' }]}>{destinationName}</Text>
        </TouchableOpacity>
        <Text style={styles.arrivalLabel}>到着</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },

  resultCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 10, elevation: 2, overflow: 'hidden' },
  cardHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeLabel: { fontSize: 18, fontWeight: 'bold' },
  durationLabel: { color: '#666', marginTop: 4, fontSize: 12 },

  timeline: { backgroundColor: '#FAFAFA', padding: 16, borderTopWidth: 1, borderColor: '#eee' },
  row: { flexDirection: 'row', minHeight: 60 },
  timeText: { width: 40, fontSize: 12, fontWeight: 'bold', color: '#555', marginTop: 2 },

  lineCol: { width: 20, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', backgroundColor: '#fff', zIndex: 1 },
  line: { width: 2, flex: 1, position: 'absolute', top: 12, bottom: -10 },

  infoCol: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  stationName: { fontSize: 15, fontWeight: '600', marginBottom: 4, color: '#000' },

  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { flexDirection: 'row', backgroundColor: '#999', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignItems: 'center', marginRight: 8 },
  badgeText: { color: '#fff', fontSize: 10, marginLeft: 4, fontWeight: 'bold' },

  stopsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eee', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  stopsBtnText: { fontSize: 11, color: '#666', marginRight: 2 },

  stopsList: { marginBottom: 20 },
  stopItem: { flexDirection: 'row', alignItems: 'center', height: 24, marginBottom: 4 },
  smallDot: { width: 6, height: 6, borderRadius: 3, position: 'absolute', left: -23 },
  stopName: { fontSize: 13, color: '#666' },

  arrivalLabel: { fontSize: 12, color: '#F44336', fontWeight: 'bold' },
});