"use client";

import { useEffect, useState } from 'react';
import { usePrayerTimesStore } from '@/lib/store';

export function DynamicBackground() {
  const { currentTime, prayerTimes, twilightPeriods } = usePrayerTimesStore();
  const [backgroundStyle, setBackgroundStyle] = useState('');

  useEffect(() => {
    if (!prayerTimes || !twilightPeriods) return;

    // Calculate background gradient based on time of day
    let gradient = '';
    const now = currentTime;

    // Deep Night (Astronomical Dusk to Astronomical Dawn) - Dark Blue/Black
    if (
      (now >= twilightPeriods.astronomicalDusk || now < twilightPeriods.astronomicalDawn)
    ) {
      gradient = 'linear-gradient(to bottom, #050518, #0c0c29)';
    }
    // Astronomical Dawn to Nautical Dawn - Deep Blue/Purple
    else if (now >= twilightPeriods.astronomicalDawn && now < twilightPeriods.nauticalDawn) {
      gradient = 'linear-gradient(to bottom, #0c0c29, #1e1b4b)';
    }
    // Nautical Dawn to Civil Dawn - Purple/Indigo/Blue
    else if (now >= twilightPeriods.nauticalDawn && now < twilightPeriods.civilDawn) {
      gradient = 'linear-gradient(to bottom, #1e1b4b, #312e81)';
    }
    // Civil Dawn to Sunrise - Blue/Light Blue
    else if (now >= twilightPeriods.civilDawn && now < twilightPeriods.sunrise) {
      gradient = 'linear-gradient(to bottom, #312e81, #1e40af)';
    }
    // Sunrise to Mid-morning - Light Blue/Light Yellow
    else if (now >= twilightPeriods.sunrise && now < new Date(twilightPeriods.sunrise.getTime() + 90 * 60 * 1000)) {
      gradient = 'linear-gradient(to bottom, #1e40af, #60a5fa)';
    }
    // Mid-morning to Solar Noon - Light Blue/Cyan
    else if (now >= new Date(twilightPeriods.sunrise.getTime() + 90 * 60 * 1000) && now < twilightPeriods.solarNoon) {
      gradient = 'linear-gradient(to bottom, #60a5fa, #7dd3fc)';
    }
    // Solar Noon to Mid-afternoon - Cyan/Light Yellow
    else if (now >= twilightPeriods.solarNoon && now < prayerTimes.asr) {
      gradient = 'linear-gradient(to bottom, #7dd3fc, #93c5fd)';
    }
    // Mid-afternoon to Pre-Sunset - Light Yellow/Orange
    else if (now >= prayerTimes.asr && now < new Date(twilightPeriods.sunset.getTime() - 30 * 60 * 1000)) {
      gradient = 'linear-gradient(to bottom, #93c5fd, #3b82f6)';
    }
    // Pre-Sunset to Sunset - Orange/Red
    else if (now >= new Date(twilightPeriods.sunset.getTime() - 30 * 60 * 1000) && now < twilightPeriods.sunset) {
      gradient = 'linear-gradient(to bottom, #3b82f6, #1e3a8a)';
    }
    // Sunset to Civil Dusk - Red/Purple
    else if (now >= twilightPeriods.sunset && now < twilightPeriods.civilDusk) {
      gradient = 'linear-gradient(to bottom, #1e3a8a, #312e81)';
    }
    // Civil Dusk to Nautical Dusk - Purple/Deep Purple
    else if (now >= twilightPeriods.civilDusk && now < twilightPeriods.nauticalDusk) {
      gradient = 'linear-gradient(to bottom, #312e81, #1e1b4b)';
    }
    // Nautical Dusk to Astronomical Dusk - Deep Purple/Dark Blue
    else if (now >= twilightPeriods.nauticalDusk && now < twilightPeriods.astronomicalDusk) {
      gradient = 'linear-gradient(to bottom, #1e1b4b, #0c0c29)';
    }

    setBackgroundStyle(gradient);
  }, [currentTime, prayerTimes, twilightPeriods]);

  // Apply style to the document body
  useEffect(() => {
    if (backgroundStyle) {
      document.body.style.backgroundImage = backgroundStyle;
      // Also add a subtle texture overlay
      document.body.style.backgroundBlendMode = 'normal, overlay';
      document.body.style.backgroundSize = 'cover, 100px 100px';
    }

    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundBlendMode = '';
      document.body.style.backgroundSize = '';
    };
  }, [backgroundStyle]);

  // This component doesn't render anything visible
  return null;
}
