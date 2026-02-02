import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../constants/theme';
import { getPlayers } from '../services/database';
import { Player, Team } from '../types';

const BONUS_JUMPS = ['Bonus Jump', 'Final Bonus'];

type SetupScreenProps = {
  onStartGame: (data: { teams: Team[]; jumpOrder: string[] }) => void;
};

export const SetupScreen = ({ onStartGame }: SetupScreenProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [teamSize, setTeamSize] = useState('2');
  const [jumpOrderInput, setJumpOrderInput] = useState('Frontside, Backside, 360');
  const [bonusEnabled, setBonusEnabled] = useState(false);

  const loadPlayers = useCallback(async () => {
    const data = await getPlayers();
    setPlayers(data);
  }, []);

  useEffect(() => {
    loadPlayers().catch(() => {
      Alert.alert('Database Error', 'Unable to load players.');
    });
  }, [loadPlayers]);

  const jumpOrder = useMemo(() => {
    const base = jumpOrderInput
      .split(',')
      .map((jump) => jump.trim())
      .filter(Boolean);
    return bonusEnabled ? [...base, ...BONUS_JUMPS] : base;
  }, [jumpOrderInput, bonusEnabled]);

  const togglePlayerSelection = (id: number) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((playerId) => playerId !== id) : [...prev, id]
    );
  };

  const shufflePlayers = (list: Player[]) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const generateTeams = () => {
    const size = Number(teamSize);
    if (!size || size <= 0) {
      Alert.alert('Team Size', 'Enter a valid team size.');
      return;
    }
    if (selectedPlayers.length < size) {
      Alert.alert('Players', 'Select enough players to fill at least one team.');
      return;
    }
    if (jumpOrder.length === 0) {
      Alert.alert('Jump Order', 'Enter at least one jump.');
      return;
    }

    const selected = players.filter((player) => selectedPlayers.includes(player.id));
    const shuffled = shufflePlayers(selected);
    const nextTeams: Team[] = [];
    let teamIndex = 0;

    for (let i = 0; i < shuffled.length; i += size) {
      const chunk = shuffled.slice(i, i + size);
      teamIndex += 1;
      nextTeams.push({
        id: teamIndex,
        name: `Team ${teamIndex}`,
        players: chunk,
        position: 0,
      });
    }

    // Pass the teams + jump order up to App so GameScreen can start the match.
    onStartGame({ teams: nextTeams, jumpOrder });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Match Setup</Text>
      <Text style={styles.label}>Select Players</Text>
      <View style={styles.selectionGrid}>
        {players.map((player) => (
          <TouchableOpacity
            key={player.id}
            style={[
              styles.selectionChip,
              selectedPlayers.includes(player.id) && styles.selectionChipActive,
            ]}
            onPress={() => togglePlayerSelection(player.id)}
          >
            <Text
              style={[
                styles.selectionChipText,
                selectedPlayers.includes(player.id) && styles.selectionChipTextActive,
              ]}
            >
              {player.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Team Size</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={teamSize}
        onChangeText={setTeamSize}
      />
      <Text style={styles.label}>Jump Order (comma separated)</Text>
      <TextInput style={styles.input} value={jumpOrderInput} onChangeText={setJumpOrderInput} />
      <TouchableOpacity style={styles.toggleRow} onPress={() => setBonusEnabled(!bonusEnabled)}>
        <View style={[styles.toggle, bonusEnabled && styles.toggleActive]} />
        <Text style={styles.toggleLabel}>Bonus Jump Finale</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.primaryButtonWide} onPress={generateTeams}>
        <Text style={styles.primaryButtonText}>Generate Teams</Text>
      </TouchableOpacity>
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
  label: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    color: COLORS.text,
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  selectionChipActive: {
    backgroundColor: COLORS.highlight,
  },
  selectionChipText: {
    color: COLORS.secondary,
  },
  selectionChipTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  toggleActive: {
    backgroundColor: COLORS.highlight,
    borderColor: COLORS.highlight,
  },
  toggleLabel: {
    color: COLORS.secondary,
    fontWeight: '600',
  },
  primaryButtonWide: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontWeight: '700',
  },
});
