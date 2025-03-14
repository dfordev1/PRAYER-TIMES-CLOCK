import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { usePrayerTimesStore } from '@/lib/store';
import { calculateClockAngle, getDayPeriods, getCurrentPrayerPeriod, getTimeRemainingInPeriod } from '@/lib/prayer-times';
import { formatDistance } from 'date-fns';

export function PrayerClock() {
  const { prayerTimes, twilightPeriods, currentTime, updateCurrentTime } = usePrayerTimesStore();
  const clockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Update current time every second
    const interval = setInterval(() => {
      updateCurrentTime();
    }, 1000);

    return () => clearInterval(interval);
  }, [updateCurrentTime]);

  useEffect(() => {
    if (!prayerTimes || !twilightPeriods || !clockRef.current) return;

    const canvas = document.createElement('canvas');
    const size = Math.min(window.innerWidth - 40, 400); // Reduced max size for minimalism
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 20;

    // Fill a dark background circle for the clock
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(10, 10, 30, 0.3)';
    ctx.fill();

    // Get day periods with their colors
    const dayPeriods = getDayPeriods(prayerTimes, twilightPeriods);

    // Draw prayer time sectors with proper colors
    dayPeriods.forEach(period => {
      const startAngle = (calculateClockAngle(period.startTime) - 90) * Math.PI / 180;
      const endAngle = (calculateClockAngle(period.endTime) - 90) * Math.PI / 180;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      // More vibrant colors to ensure visibility
      ctx.fillStyle = period.color + 'BF'; // 75% opacity for better visibility
      ctx.fill();

      // Add minimal text label near the edge
      const middleAngle = (startAngle + endAngle) / 2;
      const textRadius = radius * 0.85;
      const textX = centerX + textRadius * Math.cos(middleAngle);
      const textY = centerY + textRadius * Math.sin(middleAngle);

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(middleAngle + Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '10px sans-serif'; // Smaller, cleaner font
      ctx.fillText(period.name, 0, 0);
      ctx.restore();
    });

    // Draw outer circle with a thinner stroke
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw minimalist hour markers - just 4 main points (12, 3, 6, 9)
    const majorHours = [0, 6, 12, 18]; // Midnight, 6am, noon, 6pm
    for (const i of majorHours) {
      const angle = ((i / 24) * 2 * Math.PI) - Math.PI / 2;
      const innerRadius = radius - 10;
      const outerRadius = radius;

      const x1 = centerX + innerRadius * Math.cos(angle);
      const y1 = centerY + innerRadius * Math.sin(angle);
      const x2 = centerX + outerRadius * Math.cos(angle);
      const y2 = centerY + outerRadius * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Add hour numbers only for major points
      const textRadius = radius - 16;
      const textX = centerX + textRadius * Math.cos(angle);
      const textY = centerY + textRadius * Math.sin(angle);

      ctx.fillStyle = 'white';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), textX, textY);
    }

    // Draw current time hand - thinner and more elegant
    const currentAngle = ((currentTime.getHours() + currentTime.getMinutes() / 60) / 24 * 2 * Math.PI) - Math.PI / 2;
    const handLength = radius - 30;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + handLength * Math.cos(currentAngle),
      centerY + handLength * Math.sin(currentAngle)
    );
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw a small circle at the center
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Replace any existing canvas in the clockRef
    if (clockRef.current.firstChild) {
      clockRef.current.removeChild(clockRef.current.firstChild);
    }
    clockRef.current.appendChild(canvas);

  }, [prayerTimes, twilightPeriods, currentTime]);

  if (!prayerTimes || !twilightPeriods) {
    return (
      <Card className="p-4 flex items-center justify-center bg-background/10 backdrop-blur-sm border-neutral-100/10">
        <div className="text-center">
          <div className="h-32 w-32 rounded-full bg-white/10 animate-pulse mx-auto"></div>
          <p className="mt-4 text-sm text-white/70">Loading prayer times...</p>
        </div>
      </Card>
    );
  }

  const currentPeriod = getCurrentPrayerPeriod(prayerTimes);
  const timeRemaining = getTimeRemainingInPeriod(prayerTimes);
  const formattedTimeRemaining = formatDistance(0, timeRemaining, { includeSeconds: true });

  return (
    <Card className="p-4 bg-background/10 backdrop-blur-sm border-neutral-100/10">
      <div className="text-center mb-2">
        <h2 className="text-xl font-medium text-white/90">Prayer Times</h2>
      </div>

      <div ref={clockRef} className="flex justify-center my-4">
        {/* Canvas will be inserted here */}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {prayerTimes && Object.entries(prayerTimes).map(([name, time]) => (
          <div
            key={name}
            className={`text-center p-2 rounded ${
              currentPeriod.toLowerCase().includes(name.toLowerCase())
              ? 'bg-primary/20 text-white'
              : 'bg-white/5 text-white/80'
            }`}
          >
            <p className="font-medium capitalize">{name}</p>
            <p>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
