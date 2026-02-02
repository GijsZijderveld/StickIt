import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TeamCard } from '../components/TeamCard';
import { COLORS } from '../constants/theme';
import { useGameLogic } from '../hooks/useGameLogic';
import { saveMatch } from '../services/database';
import { Team } from '../types';

type GameScreenProps = {
  teams: Team[];
  jumpOrder: string[];
  onResetMatch: () => void;
};

export const GameScreen = ({ teams, jumpOrder, onResetMatch }: GameScreenProps) => {
  const {
    teams: activeTeams,
    activeTeamId,
    matchStats,
    winner,
    setActiveTeamId,
    handleOutcome,
  } = useGameLogic({
    initialTeams: teams,
    jumpOrder,
    onMatchComplete: async (record) => {
      // Game logic calls back with the final stats; persist them to local storage.
      try {
        await saveMatch({
          date: record.date,
          winner: record.winner,
          participants: record.participants,
          stats: record.stats,
        });
      } catch (error) {
        Alert.alert('Save Error', 'Could not save the match results.');
      }
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Live Match</Text>
      <Text style={styles.subHeader}>Jump Progress</Text>
      {activeTeams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          jumpOrder={jumpOrder}
          active={activeTeamId === team.id}
          onPress={() => setActiveTeamId(team.id)}
        />
      ))}
      <Text style={styles.subHeader}>Active Team Controls</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionStick]}
          onPress={() => handleOutcome('stick')}
        >
          <Text style={styles.actionText}>Stick</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionNoStick]}
          onPress={() => handleOutcome('noStick')}
        >
          <Text style={styles.actionText}>No Stick</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionFall]}
          onPress={() => handleOutcome('fall')}
        >
          <Text style={styles.actionText}>Fall</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Match Stats</Text>
        <Text style={styles.statsText}>Stick: {matchStats.stick}</Text>
        <Text style={styles.statsText}>No Stick: {matchStats.noStick}</Text>
        <Text style={styles.statsText}>Fall: {matchStats.fall}</Text>
      </View>
      {winner && (
        <View style={styles.winnerCard}>
          <Text style={styles.winnerText}>{winner} wins!</Text>
          <TouchableOpacity style={styles.primaryButtonWide} onPress={onResetMatch}>
            <Text style={styles.primaryButtonText}>Start New Match</Text>
          </TouchableOpacity>
        </View>
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
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionStick: {
    backgroundColor: COLORS.highlight,
  },
  actionNoStick: {
    backgroundColor: COLORS.surface,
  },
  actionFall: {
    backgroundColor: COLORS.secondary,
  },
  actionText: {
    fontWeight: '700',
    color: COLORS.text,
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  statsTitle: {
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  statsText: {
    color: COLORS.secondary,
  },
  winnerCard: {
    backgroundColor: COLORS.highlight,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  winnerText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  primaryButtonWide: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.background,
    fontWeight: '700',
  },
});
