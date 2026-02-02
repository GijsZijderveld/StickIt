import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { COLORS } from '../constants/theme';
import { PlayerCard } from '../components/PlayerCard'; 
import { addPlayer, deletePlayer, getPlayers } from '../services/database';
import { Player } from '../types';

type PlayersScreenProps = {
  onPlayersUpdated?: (players: Player[]) => void;
};

export const PlayersScreen = ({ onPlayersUpdated }: PlayersScreenProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerName, setPlayerName] = useState('');
  const isFocused = useIsFocused();

  const loadPlayers = useCallback(async () => {
    const data = await getPlayers();
    setPlayers(data);
    onPlayersUpdated?.(data);
  }, [onPlayersUpdated]);

  useEffect(() => {
    if (isFocused) {
      loadPlayers();
    }
  }, [isFocused]);

  const handleAddPlayer = async () => {
    if (!playerName.trim()) {
      return;
    }
    await addPlayer(playerName.trim());
    setPlayerName('');
    loadPlayers();
  };

  const handleRemovePlayer = async (id: number) => {
    await deletePlayer(id);
    loadPlayers();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Friends</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Add a friend"
          placeholderTextColor={COLORS.secondary}
          value={playerName}
          onChangeText={setPlayerName}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleAddPlayer}>
          <Text style={styles.primaryButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      {players.length === 0 ? (
        <Text style={styles.emptyText}>No friends yet. Add your crew!</Text>
      ) : (
        players.map((player) => (
          <PlayerCard key={player.id} player={player} onRemove={handleRemovePlayer} />
        ))
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
  input: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    color: COLORS.text,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.secondary,
    marginTop: 16,
  },
});
