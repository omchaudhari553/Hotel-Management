import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { Hotel, Lock, Mail, ArrowRight } from 'lucide-react-native';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login, isLoading } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('hoteladmin');
  const [password, setPassword] = useState('Admin@12345');

  const handleLogin = async () => {
    if (!usernameOrEmail.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter email/username and password');
      return;
    }
    try {
      await login({ usernameOrEmail, password });
    } catch (err: any) {
      Alert.alert('Login Error', err?.message || 'Failed to authenticate');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brandHero}>
          <View style={styles.logoCircle}>
            <Hotel size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>AJALKAR POS</Text>
          <Text style={styles.brandSubtitle}>Hotel, Restro & Billing Management</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formHeading}>Sign In to Dashboard</Text>
          <Text style={styles.formSubheading}>Enter your credentials to manage hotel operations</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email or Username</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={usernameOrEmail}
                onChangeText={setUsernameOrEmail}
                placeholder="e.g. admin@hotel.com"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.btnText}>Login to POS</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Need an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.switchLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: Colors.accentLight,
    fontSize: 13,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
  },
  formHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textHeading,
  },
  formSubheading: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textBody,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: '#FBFBFA',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: Colors.textHeading,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 16,
    elevation: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  switchText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  switchLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
