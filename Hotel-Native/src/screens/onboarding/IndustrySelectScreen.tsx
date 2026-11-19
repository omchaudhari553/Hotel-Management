import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../theme/colors';
import { useIndustry } from '../../context/IndustryContext';
import { IndustryType } from '../../types';
import { Hotel, Coffee, UtensilsCrossed, CheckCircle2 } from 'lucide-react-native';

const INDUSTRIES: {
  id: IndustryType;
  title: string;
  marathi: string;
  description: string;
  icon: any;
  accent: string;
}[] = [
    {
      id: 'HOTEL',
      title: 'Hotel & Restaurant',
      marathi: 'हॉटेल आणि रेस्टॉरंट',
      description: 'Dine-In, Tables, Kitchen KOT, Lodging & Rooms, GST Billing & Reports',
      icon: Hotel,
      accent: '#7C2D12',
    },
    {
      id: 'CAFE',
      title: 'Cafe & Fast Food',
      marathi: 'कॅफे आणि स्नॅक्स',
      description: 'Quick Counter Billing, Barista KOT, Table Layout & Fast Takeaways',
      icon: Coffee,
      accent: '#B45309',
    },
    {
      id: 'MESS',
      title: 'Mess & Dining Hall',
      marathi: 'मेस आणि भोजनालय',
      description: 'Monthly Tiffin Subscriptions, Daily Token Billing, Attendance & Diet',
      icon: UtensilsCrossed,
      accent: '#166534',
    },
  ];

export const IndustrySelectScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { industry, setIndustry } = useIndustry();

  const handleSelect = async (selected: IndustryType) => {
    await setIndustry(selected);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Industry</Text>
        <Text style={styles.subtitle}>Select the module tailored to your hospitality business</Text>
      </View>

      <View style={styles.cardList}>
        {INDUSTRIES.map((item) => {
          const isSelected = industry === item.id;
          const IconComponent = item.icon;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                isSelected && { borderColor: item.accent, borderWidth: 2, backgroundColor: '#FFFDF9' },
              ]}
              onPress={() => handleSelect(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: item.accent }]}>
                  <IconComponent size={24} color="#FFFFFF" />
                </View>

                {isSelected ? (
                  <CheckCircle2 size={24} color={item.accent} />
                ) : (
                  <View style={styles.radioEmpty} />
                )}
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMarathi}>{item.marathi}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 30,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textHeading,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  cardList: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.textLight,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textHeading,
  },
  cardMarathi: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 6,
  },
});
