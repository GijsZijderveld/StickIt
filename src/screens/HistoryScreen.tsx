import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../constants/theme';
import { getMatchHistory } from '../services/database';
import { MatchRecord } from '../types';

export const HistoryScreen = () => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);

  const loadMatches = useCallback(async () => {
    const data = await getMatchHistory();
    setMatches(data);
  }, []);

  useEffect(() => {
    loadMatches().catch(() => {
      Alert.alert('Database Error', 'Unable to load match history.');
    });
  }, [loadMatches]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Match History</Text>
      {matches.length === 0 ? (
        <Text style={styles.emptyText}>No matches recorded yet.</Text>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.matchCard}>
              <Text style={styles.matchWinner}>{item.winner}</Text>
              <Text style={styles.matchDate}>{new Date(item.date).toLocaleString()}</Text>
              <Text style={styles.matchPlayers}>Players: {item.participants.join(', ')}</Text>
              <Text style={styles.matchStats}>
                Stick {item.stats.stick} • No Stick {item.stats.noStick} • Fall {item.stats.fall}
              </Text>
            </View>
          )}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.secondary,
    marginTop: 16,
  },
  matchCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  matchWinner: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  matchDate: {
    color: COLORS.secondary,
    marginTop: 4,
  },
  matchPlayers: {
    color: COLORS.text,
    marginTop: 6,
  },
  matchStats: {
    color: COLORS.secondary,
    marginTop: 4,
  },
});
