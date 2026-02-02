import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, Trophy, Target, Award, AlertTriangle, User, X } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { getMatchHistory } from '../services/database';
import { MatchRecord } from '../types';

type PeriodType = 'day' | 'week' | 'month' | 'year';
type MainTab = 'leaderboard' | 'elements';
type SortMode = 'winRate' | 'stickPercent' | 'mostFalls';

export const HistoryScreen = () => {
  const isFocused = useIsFocused();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [period, setPeriod] = useState<PeriodType>('week');
  const [offset, setOffset] = useState(0);
  const [mainTab, setMainTab] = useState<MainTab>('leaderboard');
  const [sortMode, setSortMode] = useState<SortMode>('winRate');
  const [elementIndex, setElementIndex] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused) {
      getMatchHistory().then(setMatches);
    }
  }, [isFocused]);

  // --- 1. Date Navigation Logic ---
  const periodInfo = useMemo(() => {
    let start = new Date();
    let end = new Date();
    if (period === 'day') {
      start.setDate(start.getDate() - offset);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      const day = start.getDay() || 7; 
      start.setDate(start.getDate() - (day - 1) - (offset * 7));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      start = new Date(start.getFullYear(), start.getMonth() - offset, 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    } else {
      start = new Date(start.getFullYear() - offset, 0, 1);
      end = new Date(start.getFullYear(), 11, 31, 23, 59, 59);
    }
    return { start, end };
  }, [period, offset]);

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const d = new Date(m.date);
      return d >= periodInfo.start && d <= periodInfo.end;
    });
  }, [matches, periodInfo]);

  // --- 2. Central Analytics Engine ---
  const data = useMemo(() => {
    const pMap: Record<string, any> = {};
    const eMap: Record<string, any> = {};

    filteredMatches.forEach((m) => {
      // 1. Find the participant string that starts with the winning team name
      const winningTeamString = m.participants.find(p => 
        p.toLowerCase().startsWith(m.winner.toLowerCase())
      ) || "";

      // 2. Remove the "Team X: " prefix to get just the names
      const namesOnly = winningTeamString.split(':').pop() || "";
      const winnerNames = namesOnly.split(',').map(name => name.trim());

      (m.events || []).forEach(e => {
        // Player stats aggregation
        if (!pMap[e.playerName]) pMap[e.playerName] = { 
          name: e.playerName, sticks: 0, falls: 0, total: 0, wins: 0, 
          matchDates: new Set(), jumps: {} 
        };
        
        const p = pMap[e.playerName];
        p.total++;
        p.matchDates.add(m.date); // Track unique matches played
        if (e.result === 'stick') p.sticks++;
        if (e.result === 'fall') p.falls++;

        // Award Win: Check if this player was in the winning team's list

        if (winnerNames.includes(e.playerName)) {
          p.winsList = p.winsList || new Set();
          p.winsList.add(m.id || m.date);
        } 

        // Element mastery tracking
        if (!eMap[e.jumpName]) eMap[e.jumpName] = { name: e.jumpName, players: {} };
        if (!eMap[e.jumpName].players[e.playerName]) eMap[e.jumpName].players[e.playerName] = { sticks: 0, total: 0 };
        eMap[e.jumpName].players[e.playerName].total++;
        if (e.result === 'stick') eMap[e.jumpName].players[e.playerName].sticks++;

        // Detailed jump stats for modal
        if (!p.jumps[e.jumpName]) p.jumps[e.jumpName] = { sticks: 0, total: 0 };
        p.jumps[e.jumpName].total++;
        if (e.result === 'stick') p.jumps[e.jumpName].sticks++;
      });
    });

    const finalLeaders = Object.values(pMap).map((p: any) => ({
      ...p,
      wins: p.winsList?.size || 0,
      stickRate: (p.sticks / p.total) * 100,
      winRate: ((p.winsList?.size || 0) / p.matchDates.size) * 100,
    })).sort((a, b) => {
      if (sortMode === 'winRate') return (b.winRate - a.winRate) || (b.stickRate - a.stickRate);
      if (sortMode === 'stickPercent') return (b.stickRate - a.stickRate) || (b.wins - a.wins);
      return b.falls - a.falls;
    });

    return {
      leaders: finalLeaders,
      elements: Object.values(eMap).map((e: any) => ({
        name: e.name,
        rankings: Object.entries(e.players).map(([name, d]: any) => ({
          name, rate: (d.sticks / d.total) * 100
        })).sort((a, b) => b.rate - a.rate)
      }))
    };
  }, [filteredMatches, sortMode]);

  const activeElement = data.elements[elementIndex];

  return (
    <View style={styles.container}>
      {/* Period Selection */}
      <View style={styles.tabContainer}>
        {(['day', 'week', 'month', 'year'] as PeriodType[]).map(p => (
          <TouchableOpacity key={p} onPress={() => {setPeriod(p); setOffset(0);}} style={[styles.tab, period === p && styles.activeTab]}>
            <Text style={[styles.tabText, period === p && styles.activeTabText]}>{p.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => setOffset(o => o + 1)}><ChevronLeft color={COLORS.primary} /></TouchableOpacity>
        <Text style={styles.dateRangeText}>{periodInfo.start.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - {periodInfo.end.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</Text>
        <TouchableOpacity onPress={() => setOffset(o => Math.max(0, o - 1))} disabled={offset === 0}><ChevronRight color={offset === 0 ? COLORS.surface : COLORS.primary} /></TouchableOpacity>
      </View>

      {/* Main Tab Switcher */}
      <View style={styles.mainTabRow}>
        <TouchableOpacity style={[styles.mainTab, mainTab === 'leaderboard' && styles.mainTabActive]} onPress={() => setMainTab('leaderboard')}>
          <Text style={styles.mainTabText}>Leaderboards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mainTab, mainTab === 'elements' && styles.mainTabActive]} onPress={() => setMainTab('elements')}>
          <Text style={styles.mainTabText}>Elements</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {mainTab === 'leaderboard' ? (
          <View>
            <View style={styles.sortRow}>
              {(['winRate', 'stickPercent', 'mostFalls'] as SortMode[]).map(m => (
                <TouchableOpacity key={m} style={[styles.sortBtn, sortMode === m && styles.sortBtnActive]} onPress={() => setSortMode(m)}>
                  <Text style={styles.sortBtnText}>{m === 'winRate' ? 'Win Rate' : m === 'stickPercent' ? 'Stick %' : 'Falls'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {data.leaders.map((p, i) => (
              <TouchableOpacity key={p.name} style={styles.listRow} onPress={() => setSelectedPlayer(p.name)}>
                <Text style={styles.rankText}>{i + 1}</Text>
                <Text style={styles.nameText}>{p.name}</Text>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={styles.statMain}>{sortMode === 'mostFalls' ? `${p.falls} Falls` : `${(sortMode === 'winRate' ? p.winRate : p.stickRate).toFixed(0)}%`}</Text>
                  <Text style={styles.statSub}>{p.wins} Wins • {p.stickRate.toFixed(0)}% Stick</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View>
            <View style={styles.elementHeader}>
              <TouchableOpacity onPress={() => setElementIndex(Math.max(0, elementIndex - 1))}><ChevronLeft color={COLORS.primary} /></TouchableOpacity>
              <Text style={styles.elementTitle}>{activeElement?.name || 'No Data'}</Text>
              <TouchableOpacity onPress={() => setElementIndex(Math.min(data.elements.length - 1, elementIndex + 1))}><ChevronRight color={COLORS.primary} /></TouchableOpacity>
            </View>
            {activeElement?.rankings.map((r: any) => (
              <View key={r.name} style={styles.listRow}>
                <Text style={styles.nameText}>{r.name}</Text>
                <Text style={styles.statMain}>{r.rate.toFixed(0)}% Stick</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* PLAYER MODAL */}
      <Modal visible={!!selectedPlayer} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeIcon} onPress={() => setSelectedPlayer(null)}><X color={COLORS.text} /></TouchableOpacity>
            <User size={40} color={COLORS.primary} style={{alignSelf: 'center'}} />
            <Text style={styles.modalName}>{selectedPlayer}</Text>
            
            {(() => {
              const p = data.leaders.find(l => l.name === selectedPlayer);
              if (!p) return null;
              const jumpArr = Object.entries(p.jumps).map(([n, d]: any) => ({n, r: d.sticks/d.total})).sort((a,b) => b.r - a.r);

              return (
                <View style={{marginTop: 20}}>
                  <View style={styles.modalGrid}>
                    <View style={styles.modalBox}><Text style={styles.modalVal}>{p.winRate.toFixed(0)}%</Text><Text style={styles.modalLab}>Wins</Text></View>
                    <View style={styles.modalBox}><Text style={styles.modalVal}>{p.stickRate.toFixed(0)}%</Text><Text style={styles.modalLab}>Stick</Text></View>
                    <View style={styles.modalBox}><Text style={styles.modalVal}>{((p.falls/p.total)*100).toFixed(0)}%</Text><Text style={styles.modalLab}>Fall</Text></View>
                  </View>
                  <Text style={styles.modalSub}>Top 3 Jumps</Text>
                  {jumpArr.slice(0,3).map(j => <Text key={j.n} style={styles.modalLine}>⭐ {j.n} ({(j.r*100).toFixed(0)}%)</Text>)}
                  <Text style={styles.modalSub}>Worst 2 Jumps</Text>
                  {[...jumpArr].reverse().slice(0,2).map(j => <Text key={j.n} style={styles.modalLine}>⚠️ {j.n} ({(j.r*100).toFixed(0)}%)</Text>)}
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.secondary, fontWeight: '700', fontSize: 10 },
  activeTabText: { color: COLORS.background },
  dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  dateRangeText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  mainTabRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  mainTab: { flex: 1, padding: 12, backgroundColor: COLORS.surface, borderRadius: 12, alignItems: 'center' },
  mainTabActive: { backgroundColor: COLORS.primary },
  mainTabText: { color: COLORS.text, fontWeight: '800' },
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sortBtn: { padding: 8, borderRadius: 8, backgroundColor: COLORS.surface },
  sortBtnActive: { backgroundColor: COLORS.highlight },
  sortBtnText: { fontSize: 10, fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 15, borderRadius: 15, marginBottom: 8 },
  rankText: { width: 25, fontWeight: '900', color: COLORS.secondary },
  nameText: { flex: 1, fontWeight: '700', color: COLORS.text },
  statMain: { fontWeight: '900', color: COLORS.highlight, fontSize: 16 },
  statSub: { fontSize: 10, color: COLORS.secondary },
  elementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  elementTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: COLORS.background, borderRadius: 25, padding: 25 },
  closeIcon: { alignSelf: 'flex-end' },
  modalName: { fontSize: 24, fontWeight: '900', color: COLORS.text, textAlign: 'center', marginTop: 5 },
  modalGrid: { flexDirection: 'row', gap: 10, marginVertical: 20 },
  modalBox: { flex: 1, backgroundColor: COLORS.surface, padding: 12, borderRadius: 15, alignItems: 'center' },
  modalVal: { fontSize: 18, fontWeight: '900', color: COLORS.highlight },
  modalLab: { fontSize: 10, color: COLORS.secondary },
  modalSub: { fontWeight: '800', color: COLORS.primary, marginTop: 15, marginBottom: 5 },
  modalLine: { color: COLORS.text, fontSize: 14, marginBottom: 3 }
});