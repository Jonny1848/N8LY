import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Settings,
  Ticket,
  Heart,
  MapPin,
  Calendar,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  HelpCircle,
  Star
} from 'lucide-react-native';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function ProfileScreen() {
  const router = useRouter();
  const [user] = useState({
    name: 'Max Mustermann',
    username: '@maxmuster',
    bio: 'Techno-Lover aus Berlin 🎵',
    eventsAttended: 24,
    friendsCount: 156,
  });

  // Dummy tickets
  const upcomingTickets = [
    { id: '1', event: 'Berghain Night', date: 'Sa, 15.06', venue: 'Berghain', price: '25€' },
    { id: '2', event: 'Rooftop Party', date: 'So, 16.06', venue: 'Klunkerkranich', price: '15€' },
  ];

  const handleLogout = async () => {
    console.log('[LOGOUT] Starting logout process...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[LOGOUT] Fehler beim Logout:', error);
    } else {
      console.log('[LOGOUT] signOut successful, waiting for auth state change...');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Logout */}
        <View className="px-5 mb-6">
          <Pressable 
            className="flex-row items-center justify-center gap-3 py-4 rounded-xl border border-red-200"
            style={{ backgroundColor: '#FEE2E2' }}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#EF4444" />
            <Text className="text-base font-semibold" style={{ color: '#EF4444', fontFamily: 'Manrope_600SemiBold' }}>
              Abmelden
            </Text>
          </Pressable>
        </View>

        {/* App Version */}
        <View className="items-center py-4">
          <Text className="text-xs text-gray-500" style={{ fontFamily: 'Manrope_400Regular' }}>N8TLY Version 1.0.0</Text>
        </View>

        {/* Bottom Spacing */}
        <View className="h-5" />
    </ScrollView>
    </SafeAreaView>
  );
}