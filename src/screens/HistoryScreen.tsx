import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, Trophy, Target, Award } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { getMatchHistory } from '../services/database';
import { MatchRecord } from '../types';

type PeriodType = 'day' | 'week' | 'month' | 'year';

export const HistoryScreen = () => {
  const isFocused = useIsFocused();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [period, setPeriod] = useState<PeriodType>('week');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (isFocused) {
      getMatchHistory().then(setMatches);
    }
  }, [isFocused]);

  // --- Date Logic ---
  const periodInfo = useMemo(() => {
    let start = new Date();
    let end = new Date();
    if (period === 'day') {
      start.setDate(start.getDate() - offset);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
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

  // --- Leaderboard Calculation ---
  const leaderboard = useMemo(() => {
    const playerMap: Record<string, { sticks: number; total: number }> = {};
    
    filteredMatches.forEach(match => {
      (match.events || []).forEach(event => {
        if (!playerMap[event.playerName]) {
          playerMap[event.playerName] = { sticks: 0, total: 0 };
        }
        playerMap[event.playerName].total += 1;
        if (event.result === 'stick') {
          playerMap[event.playerName].sticks += 1;
        }
      });
    });

    return Object.entries(playerMap)
      .map(([name, data]) => ({
        name,
        percentage: ((data.sticks / data.total) * 100).toFixed(1),
        sticks: data.sticks,
        total: data.total
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  }, [filteredMatches]);

  return (
    <View style={styles.container}>
      {/* Period Selector & Date Nav (Keep from previous version) */}
      <View style={styles.tabContainer}>
        {(['day', 'week', 'month', 'year'] as PeriodType[]).map(p => (
          <TouchableOpacity key={p} onPress={() => {setPeriod(p); setOffset(0);}} style={[styles.tab, period === p && styles.activeTab]}>
            <Text style={[styles.tabText, period === p && styles.activeTabText]}>{p.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => setOffset(o => o + 1)}><ChevronLeft color={COLORS.primary} size={28} /></TouchableOpacity>
        <Text style={styles.dateRangeText}>{periodInfo.start.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - {periodInfo.end.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</Text>
        <TouchableOpacity onPress={() => setOffset(o => Math.max(0, o - 1))} disabled={offset === 0}><ChevronRight color={offset === 0 ? COLORS.surface : COLORS.primary} size={28} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Rankings Section */}
        <Text style={styles.sectionHeader}>Leaderboard</Text>
        <View style={styles.leaderboardCard}>
          {leaderboard.length > 0 ? (
            leaderboard.map((player, index) => (
              <View key={player.name} style={[styles.leaderboardRow, index === 0 && styles.firstPlaceRow]}>
                <View style={styles.rankBadge}>
                  {index === 0 ? <Trophy size={16} color="#FFD700" /> : <Text style={styles.rankText}>{index + 1}</Text>}
                </View>
                <Text style={styles.playerName}>{player.name}</Text>
                <View style={styles.statsContainer}>
                  <Text style={styles.percentText}>{player.percentage}%</Text>
                  <Text style={styles.ratioText}>{player.sticks}/{player.total}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No data for this period</Text>
          )}
        </View>

        {/* Recent Matches Section */}
        <Text style={styles.sectionHeader}>Recent Matches</Text>
        {filteredMatches.map((item) => (
          <View key={item.id} style={styles.matchItem}>
            <View style={styles.matchMain}>
              <Text style={styles.matchWinner}>🏆 {item.winner}</Text>
              <Text style={styles.matchDate}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.matchPlayers}>{item.participants.join(' vs ')}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  sectionHeader: { fontSize: 18, fontWeight: '900', color: COLORS.text, marginBottom: 12, marginTop: 10 },
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.secondary, fontWeight: '700', fontSize: 11 },
  activeTabText: { color: COLORS.background },
  dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  dateRangeText: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  leaderboardCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 10, marginBottom: 20 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  firstPlaceRow: { backgroundColor: 'rgba(255, 215, 0, 0.1)', borderRadius: 12 },
  rankBadge: { width: 30, alignItems: 'center' },
  rankText: { color: COLORS.secondary, fontWeight: '800' },
  playerName: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text, marginLeft: 10 },
  statsContainer: { alignItems: 'flex-end' },
  percentText: { fontSize: 16, fontWeight: '900', color: COLORS.highlight },
  ratioText: { fontSize: 10, color: COLORS.secondary, fontWeight: '600' },
  matchItem: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 15, marginBottom: 10 },
  matchMain: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  matchWinner: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  matchDate: { fontSize: 11, color: COLORS.secondary },
  matchPlayers: { fontSize: 12, color: COLORS.secondary },
  emptyText: { textAlign: 'center', color: COLORS.secondary, padding: 20, fontStyle: 'italic' }
});