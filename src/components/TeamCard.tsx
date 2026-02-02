import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../constants/theme';
import { Team } from '../types';

type TeamCardProps = {
  team: Team;
  jumpOrder: string[];
  active: boolean;
  onPress: () => void;
};

export const TeamCard = ({ team, jumpOrder, active, onPress }: TeamCardProps) => (
  <TouchableOpacity
    style={[styles.teamCard, active && styles.teamCardActive]}
    onPress={onPress}
  >
    <Text style={styles.teamName}>{team.name}</Text>
    <Text style={styles.teamPlayers}>
      {team.players.map((player) => player.name).join(', ')}
    </Text>
    <Text style={styles.teamJump}>Current Jump: {jumpOrder[team.position] ?? 'Waiting'}</Text>
    <View style={styles.progressRow}>
      {jumpOrder.map((jump, index) => (
        <View
          key={`${team.id}-${jump}-${index}`}
          style={[styles.progressDot, index <= team.position && styles.progressDotActive]}
        />
      ))}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  teamCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  teamCardActive: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  teamPlayers: {
    color: COLORS.secondary,
    marginTop: 4,
  },
  teamJump: {
    color: COLORS.text,
    marginTop: 6,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  progressDotActive: {
    backgroundColor: COLORS.highlight,
    borderColor: COLORS.highlight,
  },
});
