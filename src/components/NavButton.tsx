import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { COLORS } from '../constants/theme';

type NavButtonProps = {
  icon: JSX.Element;
  label: string;
  active: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export const NavButton = ({ icon, label, active, onPress, style }: NavButtonProps) => (
  <TouchableOpacity
    style={[styles.navButton, active && styles.navButtonActive, style]}
    onPress={onPress}
  >
    {icon}
    <Text style={styles.navText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
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
});
