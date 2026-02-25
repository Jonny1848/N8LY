import { View} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterBottomSheet } from '../../components/FilterBottomSheet';
import { useFilterStore } from '../store/filterStore';
import Map from '@/components/home/Map';
import Filter from '@/components/home/Filter';
import SearchBar from '@/components/home/SearchBar';

export default function HomeScreen() {

  const { filterVisible, setFilterVisible } = useFilterStore();

  return (
    <View className="flex-1 bg-white">
      
      {/* Karte */}
      <Map/>

      {/* Filter */}
        <SafeAreaView edges={['top']} className="absolute top-0 right-0 z-10">
          <Filter/>
        </SafeAreaView>

      {/* Suche */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 z-5">
        <SearchBar/>
      </SafeAreaView>

      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={() => { }}
        onReset={() => { }}
      />
    </View>
  );
}