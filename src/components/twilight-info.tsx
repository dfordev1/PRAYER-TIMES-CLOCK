import { Card } from '@/components/ui/card';
import { usePrayerTimesStore } from '@/lib/store';

export function TwilightInfo() {
  const { twilightPeriods, loading } = usePrayerTimesStore();

  if (loading || !twilightPeriods) {
    return (
      <Card className="p-4 bg-background/10 backdrop-blur-sm border-neutral-100/10">
        <h2 className="text-lg font-medium mb-2 text-white/90">Astronomical Data</h2>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 bg-white/10 animate-pulse rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="p-4 bg-background/10 backdrop-blur-sm border-neutral-100/10">
      <h2 className="text-lg font-medium mb-3 text-white/90">Twilight Periods</h2>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1 text-xs">
          <h3 className="text-xs font-medium col-span-2 text-white/80 uppercase tracking-wider mb-1">Morning</h3>
          <div className="text-white/60">Astronomical Dawn:</div>
          <div className="text-white/90 font-medium">{formatTime(twilightPeriods.astronomicalDawn)}</div>
          <div className="text-white/60">Nautical Dawn:</div>
          <div className="text-white/90 font-medium">{formatTime(twilightPeriods.nauticalDawn)}</div>
          <div className="text-white/60">Civil Dawn:</div>
          <div className="text-white/90 font-medium">{formatTime(twilightPeriods.civilDawn)}</div>
          <div className="text-white/60">Sunrise:</div>
          <div className="text-white/90 font-medium">{formatTime(twilightPeriods.sunrise)}</div>
        </div>

        <div className="grid grid-cols-2 gap-1 text-xs">
          <h3 className="text-xs font-medium col-span-2 text-white/80 uppercase tracking-wider mb-1">Evening</h3>
          <div className="text-white/60">Sunset:</div>
          <div className="text-white/90 font-medium">{formatTime(twilightPeriods.sunset)}</div>
          <div className="text-white/60">Civil Dusk:</div>
          <div className="text-white/90 font-medium">{formatTime(twilightPeriods.civilDusk)}</div>
          <div className="text-white/60">Nautical Dusk:</div>
          <div className="text-white/90 font-medium">{formatTime(twilightPeriods.nauticalDusk)}</div>
          <div className="text-white/60">Astronomical Dusk:</div>
          <div className="text-white/90 font-medium">{formatTime(twilightPeriods.astronomicalDusk)}</div>
        </div>
      </div>
    </Card>
  );
}
