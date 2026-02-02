import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { getPlayers } from '../services/database';
import { Player, Team } from '../types';

type SetupScreenProps = {
  onStartGame: (data: { teams: Team[]; jumpOrder: string[] }) => void;
};

export const SetupScreen = ({ navigation }: any) => { 
  const isFocused = useIsFocused();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [numberOfTeams, setNumberOfTeams] = useState('2'); // Changed from team size to number of teams

  const loadPlayers = useCallback(async () => {
    const data = await getPlayers();
    setPlayers(data);
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadPlayers().catch(() => Alert.alert('Error', 'Unable to load players.'));
    }
  }, [isFocused, loadPlayers]);

  const togglePlayerSelection = (id: number) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const shuffleArray = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const generateTeams = () => {
    const numTeams = parseInt(numberOfTeams);
    if (isNaN(numTeams) || numTeams < 2) {
      Alert.alert('Teams', 'Please specify at least 2 teams.');
      return;
    }
    if (selectedPlayers.length < numTeams) {
      Alert.alert('Players', 'You need at least one player per team.');
      return;
    }

    const selected = players.filter((p) => selectedPlayers.includes(p.id));
    const shuffled = shuffleArray(selected);
    
    const nextTeams: Team[] = Array.from({ length: numTeams }, (_, i) => ({
      id: i + 1,
      name: `Team ${i + 1}`,
      players: [],
      position: 0,
    }));

    shuffled.forEach((player, index) => {
      const teamIndex = index % numTeams;
      nextTeams[teamIndex].players.push(player);
    });

    // 2. Navigate to 'Game' and pass the teams through route params
    navigation.navigate('Game', { teams: nextTeams }); 
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Match Setup</Text>
      
      <Text style={styles.label}>Who is playing today?</Text>
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
            <Text style={[
                styles.selectionChipText,
                selectedPlayers.includes(player.id) && styles.selectionChipTextActive,
            ]}>
              {player.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.settingsRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Number of Teams</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={numberOfTeams}
            onChangeText={setNumberOfTeams}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButtonWide} onPress={generateTeams}>
        <Text style={styles.primaryButtonText}>Start Game</Text>
      </TouchableOpacity>
      
      <Text style={styles.infoText}>
        The game will use the jump order saved in your Rules tab.
      </Text>
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
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 15,
  },
  infoText: {
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
