import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

import { useLanguage } from '../context/LanguageContext';

interface KPICardProps {
  label: string;
  amount: number | string;
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: 'positive' | 'negative' | 'neutral';
  color?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  amount,
  icon,
  subtitle,
  trend,
  color = Colors.primary,
}) => {
  const { toDevanagari, t } = useLanguage();
  const rawFormatted = typeof amount === 'number'
    ? amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(amount);
  const formattedAmount = rawFormatted.startsWith('₹') ? toDevanagari(rawFormatted) : `₹ ${toDevanagari(rawFormatted)}`;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{t(label, label)}</Text>
        {icon ? <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>{icon}</View> : null}
      </View>

      <Text style={[styles.amount, { color }]}>{formattedAmount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconWrap: {
    padding: 5,
    borderRadius: 6,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginVertical: 2,
  },
});
