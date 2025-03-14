"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { usePrayerTimesStore } from '@/lib/store';

export function CurrentTime() {
  const { currentTime } = usePrayerTimesStore();
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [formattedTime, setFormattedTime] = useState<string>('');

  useEffect(() => {
    // Format date: e.g., "Friday, March 14"
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    };
    setFormattedDate(currentTime.toLocaleDateString(undefined, dateOptions));

    // Format time: e.g., "14:30:25"
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    setFormattedTime(currentTime.toLocaleTimeString(undefined, timeOptions));
  }, [currentTime]);

  return (
    <Card className="p-4 bg-background/10 backdrop-blur-sm border-neutral-100/10">
      <div className="text-center">
        <p className="text-xs text-white/60">{formattedDate}</p>
        <p className="text-3xl font-light mt-1 text-white">{formattedTime}</p>
      </div>
    </Card>
  );
}
