import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * BranchesScreen has been removed as per system requirements.
 */
export const BranchesScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Branch module has been removed.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
});
