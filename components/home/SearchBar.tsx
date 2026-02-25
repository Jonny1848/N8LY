import { View, TextInput} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {MagnifyingGlassIcon } from 'react-native-heroicons/solid';
import { theme } from '../../constants/theme';

import { useGeneralStore } from '@/app/store/generalStore';


export default function SearchBar() {
  const { searchQuery, setSearchQuery, searchEdit, setSearchEdit } = useGeneralStore();

  return (
        <View className="px-5 pb-2 mb-1">
          <View className="flex-row items-center bg-white rounded-full px-5 py-4 shadow-xl space-x-10">
            <MagnifyingGlassIcon size={22} color={theme.colors.neutral.gray[500]} />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-900"
              placeholder="Wohin möchtest du?"
              placeholderTextColor={theme.colors.neutral.gray[400]}
              value={searchEdit}
              onChangeText={setSearchEdit}
              onSubmitEditing={() => {
                setSearchQuery(searchEdit);
              }}
              style={{ fontFamily: 'Manrope_400Regular' }}
            />
          </View>
        </View>
  );
}