import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { FilterBottomSheet } from '../../components/FilterBottomSheet';
import {
  ListeBottomSheet,
  type ListeBottomSheetRef,
} from '@/components/ListeBottomSheet';
import { useFilterStore } from '../store/filterStore';
import Map, { type MapHandle } from '@/components/home/Map';
import SearchBar from '@/components/home/SearchBar';
import MapListFloatingBar, {
  HomeViewMode,
} from '@/components/home/MapListFloatingBar';
import { useEventStore } from '@/app/store/eventStore';

export default function HomeScreen() {
  const { filterVisible, setFilterVisible } = useFilterStore();
  const { setSelectedEvent } = useEventStore();
  const mapRef = useRef<MapHandle>(null);

  const [listeSheetVisible, setListeSheetVisible] = useState(false);
  const listeSheetRef = useRef<ListeBottomSheetRef>(null);

  const viewMode: HomeViewMode = listeSheetVisible ? 'list' : 'map';

  const toggleListMode = useCallback(() => {
    if (listeSheetVisible) {
      listeSheetRef.current?.dismiss();
    } else {
      setListeSheetVisible(true);
    }
  }, [listeSheetVisible]);

  // Beim Öffnen der Liste keine Karten-Selektion „mitnehmen“
  useEffect(() => {
    if (listeSheetVisible) {
      void setSelectedEvent(null);
    }
  }, [listeSheetVisible, setSelectedEvent]);

  return (
    <View className="flex-1 bg-white">
      <Map ref={mapRef} />

      {!listeSheetVisible && (
        <SearchBar onLocatePress={() => mapRef.current?.centerOnUser()} />
      )}

      <MapListFloatingBar
        viewMode={viewMode}
        onToggleViewMode={toggleListMode}
        onOpenFilter={() => setFilterVisible(true)}
      />

      <ListeBottomSheet
        ref={listeSheetRef}
        visible={listeSheetVisible}
        onClose={() => setListeSheetVisible(false)}
      />

      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={() => {}}
        onReset={() => {}}
      />
    </View>
  );
}
