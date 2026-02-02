import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { RotateCcw } from 'lucide-react-native'; // Import for Undo icon
import { COLORS } from '../constants/theme';
import { useGameLogic } from '../hooks/useGameLogic';
import { saveMatch, getSavedOrder, getJumpLibrary } from '../services/database';
import { Modal, FlatList } from 'react-native';

export const GameScreen = ({ route, navigation }: any) => {
  const { teams } = route.params; 
  const isFocused = useIsFocused();
  const [dbJumpOrder, setDbJumpOrder] = useState<string[]>([]);
  const [library, setLibrary] = useState<string[]>([]);
  const [selectedChoiceJumps, setSelectedChoiceJumps] = useState<Record<number, Record<number, string>>>({});
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  

  useEffect(() => {
  const loadData = async () => {
    try {
      // Clean, high-level service calls
      const [savedSequence, fullLibrary] = await Promise.all([
        getSavedOrder(),
        getJumpLibrary()
      ]);

      if (savedSequence.length === 0) {
        Alert.alert("No Rules", "Please set a jump order in the Rules tab first!");
      }
      
      setDbJumpOrder(savedSequence);
      setLibrary(fullLibrary);
      
    } catch (error) {
      console.error("Error loading game data:", error);
      Alert.alert("Error", "Failed to load game data from storage.");
    }
  };

  if (isFocused) loadData();
}, [isFocused]);

  const getAvailableChoiceJumps = () => {
    // 1. Start with tricks not in the standard game sequence
    let available = library.filter(jump => !dbJumpOrder.includes(jump));

    // 2. Filter out tricks this specific player has already picked for other choice slots
    const playerSelections = selectedChoiceJumps[activePlayer.id] || {};
    const alreadyPickedByPlayer = Object.values(playerSelections);

    return available.filter(jump => !alreadyPickedByPlayer.includes(jump));
  };

  const handlePickChoice = (playerId: number, jumpName: string, choiceIndex: number) => {
    // 1. Save the choice to the screen state
    setSelectedChoiceJumps(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || {}),
        [choiceIndex]: jumpName
      }
    }));

    // 2. Automatically close the modal
    setIsPickerVisible(false);
  };

  // Use the new hook signature: (teams, jumpOrder, onMatchComplete)
  const {
    teams: activeTeams,
    activeTeam,
    activePlayer,
    winner,
    turnNumber,
    handleOutcome,
    undoLastTurn,
  } = useGameLogic(teams, dbJumpOrder, async (record: any) => {
    try {
      await saveMatch(record);
    } catch (error) {
      Alert.alert('Database Error', 'Match results could not be saved.');
    }
  });

  const isOnChoice = activeTeam.position >= dbJumpOrder.length;
  const currentChoiceIdx = isOnChoice ? (activeTeam.position - dbJumpOrder.length + 1) : null;
  const pickedJumpName = (isOnChoice && currentChoiceIdx) 
    ? selectedChoiceJumps[activePlayer.id]?.[currentChoiceIdx] 
    : null;

  const handleUndo = () => {
    const undoneEvent = undoLastTurn();
    if (undoneEvent && undoneEvent.isChoiceJump) {
       // Optional: You could clear the choice here, but keeping it 
       // allows them to quickly re-try the same jump after a mistake.
    }
  };

  const handleFinish = () => {
  // This replaces the entire navigation history
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };
  
  const getCurrentJumpName = (position: number) => {
    if (position < dbJumpOrder.length) return dbJumpOrder[position];
    if (position === dbJumpOrder.length) return "CHOICE JUMP 1";
    if (position === dbJumpOrder.length + 1) return "FINAL CHOICE JUMP";
    return "MATCH COMPLETE";
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* KEPT YOUR HEADER STYLE */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Stick It: Live</Text>
          <Text style={styles.turnIndicator}>Turn #{turnNumber}</Text>
        </View>
        {!winner && (
          <TouchableOpacity onPress={undoLastTurn} style={styles.undoBtn}>
            <RotateCcw size={18} color={COLORS.primary} />
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Jumper Card with Modal Trigger */}
      {!winner && activePlayer && (
        <View style={styles.activeTurnCard}>
          <Text style={styles.playerName}>{activePlayer.name}</Text>
          <Text style={styles.teamSubText}>({activeTeam.name})</Text>
          
          <TouchableOpacity 
            onPress={() => isOnChoice && !pickedJumpName && setIsPickerVisible(true)}
            style={[styles.jumpBadge, isOnChoice && !pickedJumpName && styles.pickerTrigger]}
          >
            <Text style={styles.jumpText}>
              {pickedJumpName || (isOnChoice ? "SELECT CHOICE JUMP" : dbJumpOrder[activeTeam.position])}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* The Choice Picker Modal */}
      <Modal visible={isPickerVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Choice Jump {currentChoiceIdx}</Text>
            
            {/* Change FlatList to a ScrollView + Map */}
            <ScrollView style={{ maxHeight: 400 }}> 
              {getAvailableChoiceJumps().map((item) => (
                <TouchableOpacity 
                  key={item} 
                  style={styles.modalItem} 
                  onPress={() => handlePickChoice(activePlayer.id, item, currentChoiceIdx!)}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity onPress={() => setIsPickerVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      
      
      <View style={styles.progressContainer}>
        {activeTeams.map((team) => (
          <View 
            key={team.id} 
            style={[
              styles.teamWrapper, 
              activeTeam.id === team.id && styles.activeWrapper
            ]}
          >
            <View style={styles.teamHeader}>
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.currentJump}>{getCurrentJumpName(team.position)}</Text>
            </View>
            <Text style={styles.playerList}>
              {team.players.map(p => p.name).join(', ')}
            </Text>
          </View>
        ))}
      </View>

      {!winner && (!isOnChoice || pickedJumpName) && (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.btn, styles.btnStick]} 
            onPress={() => handleOutcome('stick', pickedJumpName || undefined)}
          >
            <Text style={styles.btnText}>STICK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnNo]} onPress={() => handleOutcome('noStick')}>
            <Text style={styles.btnText}>NO STICK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnFall]} onPress={() => handleOutcome('fall')}>
            <Text style={styles.btnText}>FALL</Text>
          </TouchableOpacity>
        </View>
      )}

      {winner && (
        <View style={styles.winnerCard}>
          <Text style={styles.winnerTitle}>🏆 {winner} Wins!</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleFinish}>
            <Text style={styles.resetBtnText}>Finish & Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, backgroundColor: COLORS.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8 },
  undoText: { color: COLORS.primary, fontWeight: '700' },
  
  // New Styles for Active Jumper
  activeTurnCard: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: COLORS.highlight },
  turnLabel: { fontSize: 12, fontWeight: '800', color: COLORS.secondary, letterSpacing: 1 },
  playerName: { fontSize: 28, fontWeight: '900', color: COLORS.text, marginVertical: 4 },
  teamSubText: { fontSize: 14, fontWeight: '600', color: COLORS.secondary, marginBottom: 12 },
  jumpBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  jumpText: { color: COLORS.background, fontWeight: '700', fontSize: 14 },

  progressContainer: { gap: 12, marginBottom: 20 },
  teamWrapper: { padding: 15, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  activeWrapper: { borderColor: COLORS.highlight, backgroundColor: '#fff' },
  teamHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  teamName: { fontWeight: '700', color: COLORS.text },
  currentJump: { fontWeight: '800', color: COLORS.primary },
  playerList: { fontSize: 12, color: COLORS.secondary },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 20, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  btnStick: { backgroundColor: COLORS.highlight },
  btnNo: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.secondary },
  btnFall: { backgroundColor: COLORS.secondary },
  btnText: { fontWeight: '900', color: COLORS.text, fontSize: 16 },
  winnerCard: { padding: 25, backgroundColor: COLORS.highlight, borderRadius: 20, alignItems: 'center', marginTop: 20 },
  winnerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 15 },
  resetBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
  resetBtnText: { color: COLORS.background, fontWeight: '700' },
  pickerWrapper: { alignItems: 'center', marginTop: 10, width: '100%' },
  pickerLabel: { fontSize: 14, fontWeight: '700', color: COLORS.secondary, marginBottom: 8 },
  choiceList: { flexDirection: 'row', paddingVertical: 5 },
  choiceChip: { 
    backgroundColor: COLORS.secondary, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: COLORS.primary
  },
  choiceChipText: { color: COLORS.background, fontWeight: '600', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dim the background
    justifyContent: 'flex-end', // Pull content to bottom
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '80%', // Don't let it cover the whole screen
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },

  // Modal List Items
  modalItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  modalItemText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
  },
  closeBtnText: {
    color: COLORS.background,
    fontWeight: '800',
    fontSize: 16,
  },

  // Trigger Logic
  pickerTrigger: {
    backgroundColor: COLORS.secondary,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  
  // Header Adjustments
  turnIndicator: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
    marginTop: 4,
  },
});