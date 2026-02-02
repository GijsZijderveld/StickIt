import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../constants/theme';
import { Player } from '../types';

type PlayerCardProps = {
  player: Player;
  onRemove: (id: number) => void;
};

export const PlayerCard = ({ player, onRemove }: PlayerCardProps) => (
  <View style={styles.playerCard}>
    <Text style={styles.playerName}>{player.name}</Text>
    <TouchableOpacity style={styles.secondaryButton} onPress={() => onRemove(player.id)}>
      <Text style={styles.secondaryButtonText}>Remove</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  playerCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    fontSize: 16,
    color: COLORS.text,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: COLORS.background,
    fontWeight: '600',
  },
});
