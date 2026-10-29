import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { useIndustry } from '../context/IndustryContext';
import { useLanguage } from '../context/LanguageContext';
import { useBranch } from '../context/BranchContext';
import { UtensilsCrossed, Hotel, Coffee, Building2 } from 'lucide-react-native';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  style?: any;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, rightAction, style }) => {
  const { industry } = useIndustry();
  const { language, t } = useLanguage();
  const { getBranchName } = useBranch();

  const getIndustryIcon = () => {
    switch (industry) {
      case 'HOTEL':
        return <Hotel size={14} color="#FFFFFF" />;
      case 'CAFE':
        return <Coffee size={14} color="#FFFFFF" />;
      case 'MESS':
        return <UtensilsCrossed size={14} color="#FFFFFF" />;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.badge}>
            {getIndustryIcon()}
            <Text style={styles.badgeText}>{industry}</Text>
          </View>
          <Text style={styles.appName}>{t('appName', 'AJALKAR POS')}</Text>
        </View>

        <View style={styles.branchChip}>
          <Building2 size={11} color="#FED7AA" />
          <Text style={styles.branchChipText} numberOfLines={1}>
            {getBranchName(language)}
          </Text>
        </View>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {rightAction ? <View style={styles.rightActionWrap}>{rightAction}</View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#7C2D12',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B45309',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    gap: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    maxWidth: 140,
  },
  branchChipText: {
    color: '#FED7AA',
    fontSize: 9.5,
    fontWeight: '700',
  },
  appName: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  titleSection: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  rightActionWrap: {
    marginLeft: 8,
  },
  subtitle: {
    color: '#FED7AA',
    fontSize: 11,
    marginTop: 1,
  },
});
