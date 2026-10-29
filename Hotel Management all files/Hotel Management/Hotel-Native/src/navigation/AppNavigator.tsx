import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useIndustry } from '../context/IndustryContext';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { IndustrySelectScreen } from '../screens/onboarding/IndustrySelectScreen';
import { Colors } from '../theme/colors';

// Direct module screens
import { TablesKOTScreen } from '../screens/hotel/TablesKOTScreen';
import { HotelBillingScreen } from '../screens/hotel/HotelBillingScreen';
import { KOTScreen } from '../screens/hotel/KOTScreen';
import { PaymentsScreen } from '../screens/hotel/PaymentsScreen';
import { PurchaseScreen } from '../screens/hotel/PurchaseScreen';
import { StaffScreen } from '../screens/hotel/StaffScreen';
import { BranchesScreen } from '../screens/hotel/BranchesScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { user, token, isLoading } = useAuth();
  const { isIndustrySelected } = useIndustry();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EA580C" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !isIndustrySelected ? (
        <Stack.Screen name="SelectIndustry" component={IndustrySelectScreen} />
      ) : (
        <>
          <Stack.Screen name="MainApp" component={MainTabNavigator} />
          <Stack.Screen name="KOT" component={KOTScreen} />
          <Stack.Screen name="Billing" component={HotelBillingScreen} />
          <Stack.Screen name="Tables" component={TablesKOTScreen} />
          <Stack.Screen name="Payments" component={PaymentsScreen} />
          <Stack.Screen name="Purchase" component={PurchaseScreen} />
          <Stack.Screen name="Staff" component={StaffScreen} />
          <Stack.Screen name="Branches" component={BranchesScreen} />
          <Stack.Screen name="SettingsTab" component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
