import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Swords, Trophy, Users } from 'lucide-react-native';

import { NavButton } from './src/components/NavButton';
import { COLORS } from './src/constants/theme';
import { initDB } from './src/services/database';
import { GameScreen } from './src/screens/GameScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { PlayersScreen } from './src/screens/PlayersScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { Team } from './src/types';

type ScreenKey = 'players' | 'setup' | 'game' | 'history';

type GameConfig = {
  teams: Team[];
  jumpOrder: string[];
};

export default function App() {
  const [screen, setScreen] = useState<ScreenKey>('players');
  const [gameConfig, setGameConfig] = useState<GameConfig>({ teams: [], jumpOrder: [] });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch(() => {
        Alert.alert('Database Error', 'Unable to initialize local storage.');
      });
  }, []);

  const handleStartGame = (data: GameConfig) => {
    // SetupScreen owns team generation and passes the roster up for GameScreen to run the match.
    setGameConfig(data);
    setScreen('game');
  };

  const handleResetMatch = () => {
    // GameScreen notifies App when a match is done so we can return to setup.
    setGameConfig({ teams: [], jumpOrder: [] });
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

      {dbReady ? (
        <>
          {screen === 'players' && <PlayersScreen />}
          {screen === 'setup' && <SetupScreen onStartGame={handleStartGame} />}
          {screen === 'game' && (
            <GameScreen
              teams={gameConfig.teams}
              jumpOrder={gameConfig.jumpOrder}
              onResetMatch={handleResetMatch}
            />
          )}
          {screen === 'history' && <HistoryScreen />}
        </>
      ) : (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading local data…</Text>
        </View>
      )}
    </SafeAreaView>
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.secondary,
    fontWeight: '600',
  },
});
