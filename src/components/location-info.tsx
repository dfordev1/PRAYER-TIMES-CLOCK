import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePrayerTimesStore } from '@/lib/store';

export function LocationInfo() {
  const { location, loading, error, fetchLocation } = usePrayerTimesStore();

  const handleRefresh = () => {
    fetchLocation();
  };

  return (
    <Card className="p-4 bg-background/10 backdrop-blur-sm border-neutral-100/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium text-white/90">Location</h2>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-white/70 hover:text-white hover:bg-white/10"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="p-2 mb-3 bg-red-500/20 text-red-200 rounded-md text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="text-white/60">Latitude:</div>
        <div className="text-white/90 font-medium">{location.latitude.toFixed(4)}°</div>

        <div className="text-white/60">Longitude:</div>
        <div className="text-white/90 font-medium">{location.longitude.toFixed(4)}°</div>

        {location.city && (
          <>
            <div className="text-white/60">City:</div>
            <div className="text-white/90 font-medium">{location.city}</div>
          </>
        )}

        {location.country && (
          <>
            <div className="text-white/60">Country:</div>
            <div className="text-white/90 font-medium">{location.country}</div>
          </>
        )}
      </div>
    </Card>
  );
}
