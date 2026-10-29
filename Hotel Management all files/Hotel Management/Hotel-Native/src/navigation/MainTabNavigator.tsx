import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HotelDashboardScreen } from '../screens/hotel/HotelDashboardScreen';
import { TablesKOTScreen } from '../screens/hotel/TablesKOTScreen';
import { HotelBillingScreen } from '../screens/hotel/HotelBillingScreen';
import { KOTScreen } from '../screens/hotel/KOTScreen';
import { PaymentsScreen } from '../screens/hotel/PaymentsScreen';
import { PurchaseScreen } from '../screens/hotel/PurchaseScreen';
import { StaffScreen } from '../screens/hotel/StaffScreen';
import { BranchesScreen } from '../screens/hotel/BranchesScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { AppSidebar } from '../components/AppSidebar';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Receipt,
  CreditCard,
  ChefHat,
  ShoppingCart,
  Users,
  Building2,
  Settings,
} from 'lucide-react-native';

const Tab = createBottomTabNavigator();

/**
 * Custom Scrollable Bottom Tab Bar (Used on mobile screens)
 * Displays ALL 9 Hotel Management modules directly in the bottom navigation.
 */
const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <View
      style={[
        styles.tabBarWrapper,
        {
          paddingBottom: Math.max(6, insets.bottom),
          height: 60 + Math.max(6, insets.bottom),
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={[styles.tabButton, isFocused && styles.tabButtonActive]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrapper, isFocused && styles.iconWrapperActive]}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: isFocused ? '#EA580C' : '#78716C',
                  size: 20,
                })}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
                numberOfLines={1}
              >
                {typeof label === 'function'
                  ? label({
                    focused: isFocused,
                    color: isFocused ? '#EA580C' : '#78716C',
                    position: 'below-icon',
                    children: route.name,
                  })
                  : String(label)}
              </Text>
              {isFocused && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const MainTabNavigator: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 800;

  const [currentTab, setCurrentTab] = useState<string>('Dashboard');
  const tabNavigationRef = useRef<any>(null);

  const handleSidebarNavigate = (routeName: string) => {
    if (tabNavigationRef.current) {
      tabNavigationRef.current.navigate(routeName);
    } else if (navigation) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View style={styles.appContainer}>
      {/* Permanent Left Sidebar on Desktop / Tablet / Wide Browser (matching Vite) */}
      {isLargeScreen && (
        <AppSidebar
          activeRouteName={currentTab}
          onNavigate={handleSidebarNavigate}
        />
      )}

      <View style={styles.mainContent}>
        <Tab.Navigator
          screenListeners={{
            state: (e: any) => {
              const routes = e.data?.state?.routes;
              const idx = e.data?.state?.index;
              if (routes && idx !== undefined && routes[idx]) {
                setCurrentTab(routes[idx].name);
              }
            },
          }}
          tabBar={(props) => {
            tabNavigationRef.current = props.navigation;
            // On desktop/tablet, AppSidebar is shown on the left, so hide the bottom bar
            if (isLargeScreen) {
              return null;
            }
            return <CustomTabBar {...props} />;
          }}
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* 1. Overview / Dashboard */}
          <Tab.Screen
            name="Dashboard"
            component={HotelDashboardScreen}
            options={{
              tabBarLabel: t('overview', 'Overview'),
              tabBarIcon: ({ color, size }) => (
                <LayoutDashboard size={size} color={color} />
              ),
            }}
          />

          {/* 2. KOT */}
          <Tab.Screen
            name="KOT"
            component={KOTScreen}
            options={{
              tabBarLabel: t('kotKitchen', 'KOT'),
              tabBarIcon: ({ color, size }) => (
                <ChefHat size={size} color={color} />
              ),
            }}
          />

          {/* 3. Billing / Invoices */}
          <Tab.Screen
            name="Billing"
            component={HotelBillingScreen}
            options={{
              tabBarLabel: t('billingGst', 'Billing'),
              tabBarIcon: ({ color, size }) => (
                <Receipt size={size} color={color} />
              ),
            }}
          />

          {/* 4. Tables */}
          <Tab.Screen
            name="Tables"
            component={TablesKOTScreen}
            options={{
              tabBarLabel: t('tables', 'Tables'),
              tabBarIcon: ({ color, size }) => (
                <UtensilsCrossed size={size} color={color} />
              ),
            }}
          />

          {/* 5. Payments */}
          <Tab.Screen
            name="Payments"
            component={PaymentsScreen}
            options={{
              tabBarLabel: t('payments', 'Payments'),
              tabBarIcon: ({ color, size }) => (
                <CreditCard size={size} color={color} />
              ),
            }}
          />

          {/* 6. Purchase */}
          <Tab.Screen
            name="Purchase"
            component={PurchaseScreen}
            options={{
              tabBarLabel: t('purchase', 'Purchase'),
              tabBarIcon: ({ color, size }) => (
                <ShoppingCart size={size} color={color} />
              ),
            }}
          />

          {/* 7. Staff */}
          <Tab.Screen
            name="Staff"
            component={StaffScreen}
            options={{
              tabBarLabel: t('staff', 'Staff'),
              tabBarIcon: ({ color, size }) => (
                <Users size={size} color={color} />
              ),
            }}
          />

          {/* 8. Branches */}
          <Tab.Screen
            name="Branches"
            component={BranchesScreen}
            options={{
              tabBarLabel: t('branches', 'Branches'),
              tabBarIcon: ({ color, size }) => (
                <Building2 size={size} color={color} />
              ),
            }}
          />

          {/* 9. Settings (with Reports inside it) */}
          <Tab.Screen
            name="SettingsTab"
            component={SettingsScreen}
            options={{
              tabBarLabel: t('settings', 'Settings'),
              tabBarIcon: ({ color, size }) => (
                <Settings size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FAF8F6',
    ...(Platform.OS === 'web' ? { width: '100%', height: '100vh', overflow: 'hidden' } : {}),
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    ...(Platform.OS === 'web' ? { height: '100vh', overflowY: 'auto', overflowX: 'hidden' } : {}),
  },
  tabBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EBE1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    minWidth: '100%',
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 64,
    position: 'relative',
  },
  tabButtonActive: {},
  iconWrapper: {
    padding: 3,
    borderRadius: 8,
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: '#FFF7ED',
  },
  tabLabel: {
    fontSize: 9.5,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#EA580C',
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: '#78716C',
    fontWeight: '500',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EA580C',
    position: 'absolute',
    bottom: -2,
  },
});
