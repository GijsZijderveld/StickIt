import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { Plus, Trash2, ArrowDown } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import * as SQLite from 'expo-sqlite';
import { useIsFocused } from '@react-navigation/native';

export const RulesScreen = () => {
  const isFocused = useIsFocused();
  const [library, setLibrary] = useState<string[]>([]);
  const [newElement, setNewElement] = useState('');
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]); // Triggers refresh when you enter the screen

  const loadData = async () => {
    const db = await SQLite.openDatabaseAsync('stickit.db'); // Use the shared instance
    
    // 1. Load the Library
    const elements = await db.getAllAsync<{name: string}>('SELECT name FROM jump_elements');
    setLibrary(elements.map(e => e.name));

    // 2. Load the Saved Order
    const savedOrder = await db.getFirstAsync<{sequence: string}>(
      'SELECT sequence FROM jump_orders WHERE id = 1'
    );
    if (savedOrder) {
      setCurrentOrder(JSON.parse(savedOrder.sequence));
    }
  };
  useEffect(() => { loadData(); }, []);

  const addElementToLibrary = async () => {
    if (!newElement.trim()) return; // Prevent empty names
    
    const db = await SQLite.openDatabaseAsync('stickit.db');
    try {
        // Add the new jump to your permanent library
        await db.runAsync('INSERT INTO jump_elements (name) VALUES (?);', [newElement.trim()]);
        setNewElement(''); // Clear input
        loadData(); // Refresh the chips on screen
    } catch (e) { 
        Alert.alert("Duplicate", "This jump is already in your library."); 
    }
};

  const addToOrder = (name: string) => {
    setCurrentOrder([...currentOrder, name]);
  };

  const saveActiveOrder = async () => {
    if (currentOrder.length === 0) {
        Alert.alert("Error", "Your game order is empty!");
        return;
    }
    const db = await SQLite.openDatabaseAsync('stickit.db');
    // We save this as the 'default' order
    await db.runAsync(
        'INSERT OR REPLACE INTO jump_orders (id, name, sequence) VALUES (1, ?, ?);',
        ['Standard Game', JSON.stringify(currentOrder)]
    );
    Alert.alert("Success", "Game order saved for your next match!");
    };

    

  return (
    <ScrollView style={styles.container}>
        {/* 1. ADD NEW JUMP TO LIBRARY SECTION */}
        <Text style={styles.header}>Add New Jump to Library</Text>
        <View style={styles.inputRow}>
            <TextInput 
                style={styles.input} 
                placeholder="dubbel hurk 3/2" 
                placeholderTextColor={COLORS.secondary}
                value={newElement}
                onChangeText={setNewElement} 
            />
            <TouchableOpacity style={styles.addBtn} onPress={addElementToLibrary}>
                <Plus color={COLORS.background} size={24} />
            </TouchableOpacity>
        </View>

        {/* 2. LIBRARY SECTION */}
        <Text style={styles.header}>Available Jumps (Tap to add)</Text>
        <View style={styles.chipContainer}>
            {library.filter(item => !currentOrder.includes(item)).map((item) => (
                <TouchableOpacity key={item} style={styles.chip} onPress={() => addToOrder(item)}>
                    <Text style={styles.chipText}>+ {item}</Text>
                </TouchableOpacity>
            ))}
        </View>

        {/* 3. ACTIVE ORDER SECTION */}
        <View style={styles.orderHeaderRow}>
            <Text style={styles.header}>Active Game Sequence</Text>
            <TouchableOpacity onPress={saveActiveOrder} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save Order</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.orderList}>
            {currentOrder.map((item, index) => (
                <View key={index} style={styles.orderItem}>
                    <Text style={styles.orderNumber}>{index + 1}</Text>
                    <Text style={styles.orderName}>{item}</Text>
                    <TouchableOpacity onPress={() => setCurrentOrder(currentOrder.filter((_, i) => i !== index))}>
                        <Trash2 size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            ))}
            
            {/* The "2 Choice Jumps" visual placeholder */}
            <View style={styles.choiceJumpMarker}>
                <Text style={styles.choiceJumpText}>+ 2 Choice Jumps (Match Finale)</Text>
            </View>
        </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  chip: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: COLORS.highlight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 14,
  },
  orderList: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 8,
    marginBottom: 40,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginVertical: 4,
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  orderNumber: {
    width: 24,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  orderName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  choiceJumpMarker: {
    marginTop: 12,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.highlight,
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: 'rgba(144, 194, 231, 0.1)', // Light tint of your highlight color
  },
  choiceJumpText: {
    color: COLORS.secondary,
    fontWeight: '700',
    fontStyle: 'italic',
  },
});