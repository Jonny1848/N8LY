import { View, Text, Pressable, Image, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdjustmentsHorizontalIcon as AdjustmentsHorizontalIconOutline } from 'react-native-heroicons/outline';
import { theme } from '../../constants/theme';
import { useFilterStore } from '@/app/store/filterStore';


export default function Filter() {
  
  const {setFilterVisible } = useFilterStore();

  return (
          <View className="p-5 pt-6">
            <Pressable
              className="w-12 h-12 rounded-2xl justify-center items-center shadow-lg bg-white"
              style={{ backgroundColor: theme.colors.neutral.gray[50] }}
              onPress={() => setFilterVisible(true)}
            >
              <AdjustmentsHorizontalIconOutline size={24} color="black" />
            </Pressable>
          </View>

  );
}