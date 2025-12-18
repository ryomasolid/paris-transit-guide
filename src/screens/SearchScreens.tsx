// src/screens/SearchScreens.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Keyboard, Alert
} from 'react-native';
// ★修正: react-native から SafeAreaView を削除し、ここからインポート
import { SafeAreaView } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { searchStations, getNearbyStations } from '../services/api';
import { Station } from '../types';
import ResultScreen from './ResultScreen';

// --- 検索入力画面 ---
function SearchInputScreen() {
  const navigation = useNavigation<any>();

  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);

  const [suggestions, setSuggestions] = useState<Station[]>([]);

  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);
  const [loadingField, setLoadingField] = useState<'from' | 'to' | null>(null);

  const handleInput = async (text: string, field: 'from' | 'to') => {
    setActiveField(field);
    if (field === 'from') {
      setFromText(text);
      setFromStation(null);
    } else {
      setToText(text);
      setToStation(null);
    }

    if (text.length >= 2 || suggestions.length === 0) {
      console.log(text)
      const res = await searchStations(text);
      console.log(res)
      setSuggestions(res);
    } else {
      setSuggestions([]);
    }
  };

  const selectStation = (st: Station, targetField: 'from' | 'to' | null) => {
    const field = targetField || activeField;

    if (field === 'from') {
      setFromStation(st);
      setFromText(st.name);
    } else {
      setToStation(st);
      setToText(st.name);
    }
    setSuggestions([]);
    setActiveField(null);
    Keyboard.dismiss();
  };

  const handleFocus = (field: 'from' | 'to') => {
    setActiveField(field);
    const currentText = field === 'from' ? fromText : toText;
    if (currentText.length >= 2) {
      searchStations(currentText).then(setSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleClear = (field: 'from' | 'to') => {
    if (field === 'from') {
      setFromText('');
      setFromStation(null);
    } else {
      setToText('');
      setToStation(null);
    }
    setSuggestions([]);
    setActiveField(field);
  };

  const handleSwap = () => {
    const tempText = fromText;
    const tempStation = fromStation;

    setFromText(toText);
    setFromStation(toStation);

    setToText(tempText);
    setToStation(tempStation);

    setSuggestions([]);
  };

  const handleUseCurrentLocation = async (targetField: 'from' | 'to') => {
    setLoadingField(targetField);

    // ★テスト用座標: パリ・オペラ座
    const latitude = 48.8719;
    const longitude = 2.3316;

    try {
      const nearby = await getNearbyStations(latitude, longitude);

      if (nearby.length > 0) {
        const nearest = nearby[0];
        const displayText = nearest.name + " (現在地)";

        if (targetField === 'from') {
          setFromStation(nearest);
          setFromText(displayText);
        } else {
          setToStation(nearest);
          setToText(displayText);
        }
        setSuggestions([]);
        Keyboard.dismiss();
        setActiveField(null);
      } else {
        Alert.alert('残念', '近くに駅やバス停が見つかりませんでした');
      }
    } catch (error) {
      Alert.alert('エラー', '検索に失敗しました');
    } finally {
      setLoadingField(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>乗換案内</Text></View>

      <View style={styles.card}>
        <View style={styles.rowContainer}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="trip-origin" size={20} color="#2196F3" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="出発地 (例: Opera)"
              value={fromText}
              onFocus={() => handleFocus('from')}
              onChangeText={(t) => handleInput(t, 'from')}
            />
            {fromText.length > 0 && (
              <TouchableOpacity onPress={() => handleClear('from')} style={styles.clearBtn}>
                <MaterialIcons name="close" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.locationBtn} onPress={() => handleUseCurrentLocation('from')}>
            {loadingField === 'from' ? (
              <ActivityIndicator size="small" color="#1A237E" />
            ) : (
              <MaterialIcons name="my-location" size={22} color="#1A237E" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
            <MaterialIcons name="swap-vert" size={24} color="#1A237E" />
          </TouchableOpacity>
        </View>

        <View style={styles.rowContainer}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="place" size={20} color="#F44336" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="目的地 (例: Versailles)"
              value={toText}
              onFocus={() => handleFocus('to')}
              onChangeText={(t) => handleInput(t, 'to')}
            />
            {toText.length > 0 && (
              <TouchableOpacity onPress={() => handleClear('to')} style={styles.clearBtn}>
                <MaterialIcons name="close" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.locationBtn} onPress={() => handleUseCurrentLocation('to')}>
            {loadingField === 'to' ? (
              <ActivityIndicator size="small" color="#1A237E" />
            ) : (
              <MaterialIcons name="my-location" size={22} color="#1A237E" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {suggestions.length > 0 && (
        <View style={[styles.suggestionBox, { top: activeField === 'from' ? 210 : 300 }]}>
          <FlatList
            data={suggestions}
            keyExtractor={i => i.id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionItem} onPress={() => selectStation(item, activeField)}>
                <MaterialIcons name="train" size={18} color="#666" />
                <Text style={styles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, (!fromStation || !toStation) && styles.btnDisabled]}
        disabled={!fromStation || !toStation}
        onPress={() => navigation.navigate('Result', { from: fromStation, to: toStation })}>
        <Text style={styles.btnText}>検索</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const Stack = createNativeStackNavigator();

export default function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchInput" component={SearchInputScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { padding: 20, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A237E' },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 8, elevation: 3, zIndex: 1 },
  rowContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, marginTop: 2 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 8, height: 48, marginRight: 8 },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  clearBtn: { padding: 4 },
  locationBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8EAF6', justifyContent: 'center', alignItems: 'center' },
  dividerContainer: { height: 30, justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 2 },
  divider: { width: '90%', height: 1, backgroundColor: '#eee', position: 'absolute' },
  swapBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  suggestionBox: { position: 'absolute', left: 16, right: 16, backgroundColor: '#fff', borderRadius: 8, elevation: 10, zIndex: 100, maxHeight: 200, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  suggestionItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 0.5, borderColor: '#eee', alignItems: 'center' },
  suggestionText: { marginLeft: 10, fontSize: 15 },
  btn: { backgroundColor: '#1A237E', margin: 16, padding: 16, borderRadius: 30, alignItems: 'center', elevation: 3 },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});