// src/screens/ResultScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
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

const RouteCard = ({ route }: { route: RouteModel }) => {
  const [expanded, setExpanded] = useState(false);
  const duration = Math.floor(route.duration / 60);
  return (
    <View style={styles.resultCard}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.cardHeader}>
        <View>
          <Text style={styles.timeLabel}>
            {format(route.departureTime, 'HH:mm')} → {format(route.arrivalTime, 'HH:mm')}
          </Text>
          <Text style={styles.durationLabel}>
            {duration}分 / 乗換{Math.max(0, route.sections.filter(s => s.mode).length - 1)}回
          </Text>
        </View>
        <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={24} color="#aaa" />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.timeline}>
          {route.sections.map((s, i) => <SectionRow key={i} section={s} />)}
        </View>
      )}
    </View>
  );
};

const SectionRow = ({ section }: { section: Section }) => {
  if (section.type === 'waiting') return null;
  if ((section.type === 'transfer' || section.type === 'street_network') && section.duration < 60) return null;

  const isWalk = section.type === 'street_network' || section.type === 'transfer';
  const color = section.lineColor ? `#${section.lineColor}` : (isWalk ? '#ccc' : '#1A237E');

  let badgeText = "";
  if (isWalk) {
    badgeText = `徒歩 ${Math.ceil(section.duration / 60)}分`;
  } else if (section.mode || section.lineCode) {
    badgeText = `${section.mode || ""} ${section.lineCode || ""}`.trim();
  }

  return (
    <View style={styles.row}>
      <Text style={styles.timeText}>{format(section.departureTime, 'HH:mm')}</Text>
      <View style={styles.lineCol}>
        <View style={[styles.dot, { borderColor: color }]} />
        <View style={[styles.line, { backgroundColor: color, opacity: isWalk ? 0.3 : 1 }]} />
      </View>
      <View style={styles.infoCol}>
        <Text style={styles.stationName}>{section.fromName}</Text>
        {badgeText !== "" && (
          <View style={styles.badge}>
            <MaterialIcons name={isWalk ? "directions-walk" : "train"} size={12} color="#fff" />
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        )}
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
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, backgroundColor: '#fff', zIndex: 1 },
  line: { width: 2, flex: 1, position: 'absolute', top: 10, bottom: -10 },
  infoCol: { flex: 1, paddingLeft: 10, paddingBottom: 20 },
  stationName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  badge: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#999', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, marginLeft: 4, fontWeight: 'bold' },
});