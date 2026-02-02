import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Users, Swords, Trophy } from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';

const COLORS = {
  primary: '#A31621',
  background: '#FCF7F8',
  surface: '#CED3DC',
  secondary: '#4E8098',
  highlight: '#90C2E7',
  text: '#1C1C1C',
  white: '#FFFFFF',
};

const db = SQLite.openDatabase('stickit.db');

type Player = {
  id: number;
  name: string;
};

type MatchRecord = {
  id: number;
  date: string;
  winner: string;
  participants: string[];
  stats: {
    stick: number;
    noStick: number;
    fall: number;
  };
};

type Team = {
  id: number;
  name: string;
  players: Player[];
  position: number;
};

const BONUS_JUMPS = ['Bonus Jump', 'Final Bonus'];

type ScreenKey = 'players' | 'setup' | 'game' | 'history';

const executeSqlAsync = (sql: string, params: (string | number)[] = []) =>
  new Promise<SQLite.SQLResultSet>((resolve, reject) => {
    db.transaction((transaction) => {
      transaction.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });

export default function App() {
  const [screen, setScreen] = useState<ScreenKey>('players');
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [teamSize, setTeamSize] = useState('2');
  const [jumpOrderInput, setJumpOrderInput] = useState('Frontside, Backside, 360');
  const [bonusEnabled, setBonusEnabled] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [matchStats, setMatchStats] = useState({
    stick: 0,
    noStick: 0,
    fall: 0,
  });
  const [winner, setWinner] = useState<string | null>(null);

  const jumpOrder = useMemo(() => {
    const base = jumpOrderInput
      .split(',')
      .map((jump) => jump.trim())
      .filter(Boolean);
    return bonusEnabled ? [...base, ...BONUS_JUMPS] : base;
  }, [jumpOrderInput, bonusEnabled]);

  const loadPlayers = useCallback(async () => {
    const result = await executeSqlAsync('SELECT * FROM players ORDER BY name;');
    setPlayers(result.rows._array as Player[]);
  }, []);

  const loadMatches = useCallback(async () => {
    const result = await executeSqlAsync('SELECT * FROM matches ORDER BY date DESC;');
    const parsed = result.rows._array.map((row: any) => ({
      id: row.id,
      date: row.date,
      winner: row.winner,
      participants: JSON.parse(row.participants),
      stats: JSON.parse(row.stats),
    }));
    setMatches(parsed as MatchRecord[]);
  }, []);

  useEffect(() => {
    executeSqlAsync(
      'CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);'
    )
      .then(() =>
        executeSqlAsync(
          'CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, winner TEXT NOT NULL, participants TEXT NOT NULL, stats TEXT NOT NULL);'
        )
      )
      .then(() => Promise.all([loadPlayers(), loadMatches()]))
      .catch(() => {
        Alert.alert('Database Error', 'Unable to initialize local storage.');
      });
  }, [loadPlayers, loadMatches]);

  const handleAddPlayer = async () => {
    if (!playerName.trim()) {
      return;
    }
    await executeSqlAsync('INSERT INTO players (name) VALUES (?);', [playerName.trim()]);
    setPlayerName('');
    loadPlayers();
  };

  const handleRemovePlayer = async (id: number) => {
    await executeSqlAsync('DELETE FROM players WHERE id = ?;', [id]);
    setSelectedPlayers((prev) => prev.filter((playerId) => playerId !== id));
    loadPlayers();
  };

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
    setTeams(nextTeams);
    setActiveTeamId(nextTeams[0]?.id ?? null);
    setMatchStats({ stick: 0, noStick: 0, fall: 0 });
    setWinner(null);
    setScreen('game');
  };

  const updateTeamPosition = (teamId: number, delta: number) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) {
          return team;
        }
        const next = Math.max(0, Math.min(team.position + delta, jumpOrder.length - 1));
        return { ...team, position: next };
      })
    );
  };

  const handleOutcome = (type: 'stick' | 'noStick' | 'fall') => {
    if (!activeTeamId) {
      return;
    }
    if (type === 'stick') {
      updateTeamPosition(activeTeamId, 1);
      setMatchStats((prev) => ({ ...prev, stick: prev.stick + 1 }));
    }
    if (type === 'noStick') {
      setMatchStats((prev) => ({ ...prev, noStick: prev.noStick + 1 }));
    }
    if (type === 'fall') {
      updateTeamPosition(activeTeamId, -2);
      setMatchStats((prev) => ({ ...prev, fall: prev.fall + 1 }));
    }
  };

  useEffect(() => {
    const winningTeam = teams.find((team) => team.position >= jumpOrder.length - 1);
    if (winningTeam && !winner) {
      const winnerName = winningTeam.name;
      setWinner(winnerName);
      const participantNames = teams.flatMap((team) => team.players.map((player) => player.name));
      const date = new Date().toISOString();
      executeSqlAsync(
        'INSERT INTO matches (date, winner, participants, stats) VALUES (?, ?, ?, ?);',
        [date, winnerName, JSON.stringify(participantNames), JSON.stringify(matchStats)]
      )
        .then(() => loadMatches())
        .catch(() => {
          Alert.alert('Save Error', 'Could not save the match results.');
        });
    }
  }, [teams, jumpOrder.length, winner, matchStats, loadMatches]);

  const resetMatch = () => {
    setTeams([]);
    setWinner(null);
    setMatchStats({ stick: 0, noStick: 0, fall: 0 });
    setActiveTeamId(null);
    setScreen('setup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stick It</Text>
        <View style={styles.nav}>
          <NavButton
            icon={<Users color={COLORS.background} size={18} />}
            label="Players"
            active={screen === 'players'}
            onPress={() => setScreen('players')}
          />
          <NavButton
            icon={<Swords color={COLORS.background} size={18} />}
            label="Setup"
            active={screen === 'setup'}
            onPress={() => setScreen('setup')}
          />
          <NavButton
            icon={<Trophy color={COLORS.background} size={18} />}
            label="History"
            active={screen === 'history'}
            onPress={() => setScreen('history')}
          />
        </View>
      </View>

      {screen === 'players' && (
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
              <View key={player.id} style={styles.playerCard}>
                <Text style={styles.playerName}>{player.name}</Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => handleRemovePlayer(player.id)}
                >
                  <Text style={styles.secondaryButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {screen === 'setup' && (
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
          <TextInput
            style={styles.input}
            value={jumpOrderInput}
            onChangeText={setJumpOrderInput}
          />
          <TouchableOpacity style={styles.toggleRow} onPress={() => setBonusEnabled(!bonusEnabled)}>
            <View style={[styles.toggle, bonusEnabled && styles.toggleActive]} />
            <Text style={styles.toggleLabel}>Bonus Jump Finale</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButtonWide} onPress={generateTeams}>
            <Text style={styles.primaryButtonText}>Generate Teams</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {screen === 'game' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Live Match</Text>
          <Text style={styles.subHeader}>Jump Progress</Text>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamCard,
                activeTeamId === team.id && styles.teamCardActive,
              ]}
              onPress={() => setActiveTeamId(team.id)}
            >
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamPlayers}>
                {team.players.map((player) => player.name).join(', ')}
              </Text>
              <Text style={styles.teamJump}>
                Current Jump: {jumpOrder[team.position] ?? 'Waiting'}
              </Text>
              <View style={styles.progressRow}>
                {jumpOrder.map((jump, index) => (
                  <View
                    key={`${team.id}-${jump}-${index}`}
                    style={[
                      styles.progressDot,
                      index <= team.position && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          ))
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
              <TouchableOpacity style={styles.primaryButtonWide} onPress={resetMatch}>
                <Text style={styles.primaryButtonText}>Start New Match</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {screen === 'history' && (
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
                  <Text style={styles.matchPlayers}>
                    Players: {item.participants.join(', ')}
                  </Text>
                  <Text style={styles.matchStats}>
                    Stick {item.stats.stick} • No Stick {item.stats.noStick} • Fall {item.stats.fall}
                  </Text>
                </View>
              )}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function NavButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: JSX.Element;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.navButton, active && styles.navButtonActive]}
      onPress={onPress}
    >
      {icon}
      <Text style={styles.navText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 16,
  },
  title: {
    color: COLORS.background,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    flex: 1,
    marginHorizontal: 4,
  },
  navButtonActive: {
    backgroundColor: COLORS.highlight,
  },
  navText: {
    color: COLORS.background,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
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
  emptyText: {
    color: COLORS.secondary,
    marginTop: 16,
  },
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
