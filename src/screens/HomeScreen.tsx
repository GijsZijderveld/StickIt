import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Users, BookOpen, BarChart2, Play } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

export const HomeScreen = ({ navigation }: any) => {
  const MenuButton = ({ title, icon, onPress, color = COLORS.secondary }: any) => (
    <TouchableOpacity style={[styles.btn, { borderColor: color }]} onPress={onPress}>
      {icon}
      <Text style={[styles.btnText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
        <View style={styles.brandingContainer}>
        <Text style={styles.stickText}>STICK</Text>
        <Text style={styles.itText}>IT</Text>
        </View>
      <MenuButton 
        title="Players" 
        icon={<Users color={COLORS.secondary} />} 
        onPress={() => navigation.navigate('Players')} 
      />
      <MenuButton 
        title="Jump Rules" 
        icon={<BookOpen color={COLORS.secondary} />} 
        onPress={() => navigation.navigate('Rules')} 
      />
      <MenuButton 
        title="Data & History" 
        icon={<BarChart2 color={COLORS.secondary} />} 
        onPress={() => navigation.navigate('Data')} 
      />
      
      <TouchableOpacity 
        style={styles.playBtn} 
        onPress={() => navigation.navigate('Setup')}
      >
        <Play color={COLORS.background} size={32} fill={COLORS.background} />
        <Text style={styles.playText}>PLAY</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', gap: 15 },
  btn: { 
    flexDirection: 'row', alignItems: 'center', padding: 20, 
    borderRadius: 15, borderWidth: 2, gap: 15 
  },
  btnText: { fontSize: 18, fontWeight: '700' },
  playBtn: { 
    backgroundColor: COLORS.primary, padding: 25, borderRadius: 20, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    marginTop: 30, gap: 10 
  },
  playText: { color: COLORS.background, fontSize: 24, fontWeight: '900' },
  brandingContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  stickText: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.text, // Black or your standard text color
    letterSpacing: 4,
  },
  itText: {
    fontSize: 80,
    fontWeight: '900',
    color: COLORS.primary, // Your primary red color
    marginTop: -20, // Pulls it closer to "STICK"
  },
});