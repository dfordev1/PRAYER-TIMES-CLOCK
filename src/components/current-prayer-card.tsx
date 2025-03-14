"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { usePrayerTimesStore } from '@/lib/store';
import { getCurrentPrayerPeriod, getTimeRemainingInPeriod } from '@/lib/prayer-times';

export function CurrentPrayerCard() {
  const { prayerTimes, currentTime } = usePrayerTimesStore();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!prayerTimes) return;

    // Calculate time remaining in current prayer period
    const msRemaining = getTimeRemainingInPeriod(prayerTimes);

    // Format the time remaining
    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((msRemaining % (1000 * 60)) / 1000);

    setTimeRemaining(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
  }, [prayerTimes, currentTime]);

  if (!prayerTimes) {
    return (
      <Card className="p-4 bg-background/10 backdrop-blur-sm border-neutral-100/10">
        <div className="h-4 bg-white/10 animate-pulse rounded w-full mb-2"></div>
        <div className="h-8 bg-white/10 animate-pulse rounded w-3/4 mx-auto mb-2"></div>
        <div className="h-4 bg-white/10 animate-pulse rounded w-full"></div>
      </Card>
    );
  }

  const currentPeriod = getCurrentPrayerPeriod(prayerTimes);

  // Determine the next prayer time
  let nextPrayer = '';
  switch (currentPeriod) {
    case 'Fajr':
      nextPrayer = 'Sunrise';
      break;
    case 'Sunrise to Dhuhr':
      nextPrayer = 'Dhuhr';
      break;
    case 'Dhuhr':
      nextPrayer = 'Asr';
      break;
    case 'Asr':
      nextPrayer = 'Maghrib';
      break;
    case 'Maghrib':
      nextPrayer = 'Isha';
      break;
    case 'Isha to Fajr':
      nextPrayer = 'Fajr';
      break;
    default:
      nextPrayer = '...';
  }

  return (
    <Card className="p-4 bg-primary/5 backdrop-blur-sm border border-primary/20">
      <div className="text-center">
        <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Current Period</h2>
        <div className="my-2">
          <h3 className="text-2xl font-medium text-white">{currentPeriod}</h3>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
          <div className="text-white/60">Next Prayer:</div>
          <div className="text-white/90 font-medium">{nextPrayer}</div>

          <div className="text-white/60">Time Remaining:</div>
          <div className="text-white/90 font-medium">{timeRemaining}</div>
        </div>
      </div>
    </Card>
  );
}
