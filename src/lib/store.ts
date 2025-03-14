import { create } from 'zustand';
import { PrayerTimes, TwilightPeriods, calculatePrayerTimes, getTwilightPeriods } from './prayer-times';

interface LocationState {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

interface PrayerTimesState {
  prayerTimes: PrayerTimes | null;
  twilightPeriods: TwilightPeriods | null;
  currentTime: Date;
  loading: boolean;
  error: string | null;
  location: LocationState;

  // Actions
  fetchLocation: () => Promise<void>;
  updatePrayerTimes: () => Promise<void>;
  updateCurrentTime: () => void;
}

export const usePrayerTimesStore = create<PrayerTimesState>((set, get) => ({
  prayerTimes: null,
  twilightPeriods: null,
  currentTime: new Date(),
  loading: true,
  error: null,
  location: {
    latitude: 0,
    longitude: 0
  },

  fetchLocation: async () => {
    try {
      set({ loading: true, error: null });

      // Try to get user's location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        } else {
          reject(new Error('Geolocation is not supported by your browser'));
        }
      });

      // Update location in store
      set({
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      });

      // After getting location, update prayer times
      await get().updatePrayerTimes();
    } catch (error) {
      console.error('Error fetching location:', error);
      set({
        error: 'Could not get location. Using default values.',
        loading: false
      });

      // Use a default location (Mecca)
      set({
        location: {
          latitude: 21.4225,
          longitude: 39.8262,
          city: 'Mecca',
          country: 'Saudi Arabia'
        }
      });

      // Still try to update prayer times with default location
      await get().updatePrayerTimes();
    }
  },

  updatePrayerTimes: async () => {
    try {
      const { latitude, longitude } = get().location;

      if (latitude === 0 && longitude === 0) {
        throw new Error('Invalid location data');
      }

      // First get twilight periods from API
      const twilightPeriods = await getTwilightPeriods(latitude, longitude);

      // Then calculate prayer times using twilight data for better accuracy
      const prayerTimes = calculatePrayerTimes(latitude, longitude, twilightPeriods);

      set({
        prayerTimes,
        twilightPeriods,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error updating prayer times:', error);

      try {
        // If fetching twilight data fails, try to calculate prayer times without it
        const { latitude, longitude } = get().location;
        const prayerTimes = calculatePrayerTimes(latitude, longitude);

        set({
          prayerTimes,
          loading: false,
          error: 'Twilight data unavailable. Using approximate prayer times.'
        });
      } catch (fallbackError) {
        set({
          error: 'Failed to update prayer times. Please try again.',
          loading: false
        });
      }
    }
  },

  updateCurrentTime: () => {
    set({ currentTime: new Date() });
  }
}));
