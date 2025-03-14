"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWindowSize } from '@react-hook/window-size';
import { DateTime } from 'luxon';
import SunCalc from 'suncalc';
import { Card } from '@/components/ui/card';
import axios from 'axios';

interface PrayerTime {
  name: string;
  time: Date;
  displayName: string;
  arabicName?: string;
}

interface TwilightInfo {
  astronomicalDawn: Date;
  nauticalDawn: Date;
  civilDawn: Date;
  sunrise: Date;
  solarNoon: Date;
  sunset: Date;
  civilDusk: Date;
  nauticalDusk: Date;
  astronomicalDusk: Date;
}

// Update the prayer display names type with an index signature
const prayerDisplayNames: {
  [key: string]: { displayName: string; arabicName: string };
} = {
  fajr: { displayName: "Fajr", arabicName: "الفجر" },
  sunrise: { displayName: "Sunrise", arabicName: "الشروق" },
  dhuhr: { displayName: "Dhuhr", arabicName: "الظهر" },
  asr: { displayName: "Asr", arabicName: "العصر" },
  maghrib: { displayName: "Maghrib", arabicName: "المغرب" },
  isha: { displayName: "Isha", arabicName: "العشاء" },
};

// Add proper Hijri month names mapping
const hijriMonthNames: { [key: string]: string } = {
  // Standard spellings
  "Muharram": "Muharram",
  "Safar": "Safar",
  "Rabi' al-awwal": "Rabi' al-Awwal",
  "Rabi' al-thani": "Rabi' al-Thani",
  "Jumada al-awwal": "Jumada al-Awwal",
  "Jumada al-thani": "Jumada al-Thani",
  "Rajab": "Rajab",
  "Sha'ban": "Sha'ban",
  "Ramadan": "Ramadhan",
  "Shawwal": "Shawwal",
  "Dhu al-Qi'dah": "Dhu al-Qi'dah",
  "Dhu al-Hijjah": "Dhu al-Hijjah",
  
  // Alternative spellings and variations that might be returned by the API
  "Ramaḍān": "Ramadhan",
  "Ramadān": "Ramadhan",
  "Ramadaan": "Ramadhan",
  "Umādá al-ūlá": "Jumada al-Awwal",
  "Jumādá al-ūlá": "Jumada al-Awwal",
  "Jumada al-ula": "Jumada al-Awwal",
  "Jumādá al-ākhirah": "Jumada al-Thani",
  "Jumada al-akhirah": "Jumada al-Thani",
  "Rabīʿ al-awwal": "Rabi' al-Awwal",
  "Rabi al-awwal": "Rabi' al-Awwal",
  "Rabīʿ al-thānī": "Rabi' al-Thani",
  "Rabi al-thani": "Rabi' al-Thani",
  "Dhū al-Qaʿdah": "Dhu al-Qi'dah",
  "Dhu al-Qadah": "Dhu al-Qi'dah",
  "Dhū al-Ḥijjah": "Dhu al-Hijjah",
  "Dhu al-Hijja": "Dhu al-Hijjah",
  "Shaʿbān": "Sha'ban",
  "Shaban": "Sha'ban"
};

export default function CircularPrayerTracker() {
  const [width, height] = useWindowSize();
  const size = Math.min(width - 40, height - 200, 600);
  const clockRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [currentPrayer, setCurrentPrayer] = useState<string>("");
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [timeToNextPrayer, setTimeToNextPrayer] = useState<string>("");
  const [twilightInfo, setTwilightInfo] = useState<TwilightInfo | null>(null);
  const [hijriDate, setHijriDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState({ latitude: 0, longitude: 0 });
  const [isHanafiMethod, setIsHanafiMethod] = useState(false);
  const [usingDefaultLocation, setUsingDefaultLocation] = useState(false);
  const [locationErrorMessage, setLocationErrorMessage] = useState("");
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [locationType, setLocationType] = useState<"coordinates" | "cityCountry">("coordinates");
  const [geocodingError, setGeocodingError] = useState("");

  // Initialize location and fetch prayer times
  useEffect(() => {
    const getLocation = async () => {
      try {
        setLoading(true);
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              resolve, 
              (error) => {
                // Handle specific geolocation errors
                let errorMessage = 'Unknown error occurred';
                switch (error.code) {
                  case error.PERMISSION_DENIED:
                    errorMessage = 'Location permission denied by user';
                    break;
                  case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable';
                    break;
                  case error.TIMEOUT:
                    errorMessage = 'Location request timed out';
                    break;
                }
                console.warn(`Geolocation error: ${errorMessage}`);
                reject(new Error(errorMessage));
              },
              {
                enableHighAccuracy: true,
                timeout: 10000, // Increased timeout
                maximumAge: 0
              }
            );
          } else {
            reject(new Error('Geolocation is not supported by this browser'));
          }
        });

        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Using default location (Mecca) due to:', errorMessage);
        setLocationErrorMessage(errorMessage);
        setUsingDefaultLocation(true);
        
        // Default to Mecca coordinates
        setLocation({
          latitude: 21.4225,
          longitude: 39.8262
        });
      }
    };

    getLocation();
  }, []);

  // Fetch prayer times when location is available or calculation method changes
  useEffect(() => {
    const fetchPrayerTimes = async () => {
      if (location.latitude === 0 && location.longitude === 0) return;

      try {
        setLoading(true);
        // Format date properly as YYYY-MM-DD
        const today = new Date();
        const date = DateTime.fromJSDate(today).toFormat('yyyy-MM-dd');

        console.log(`Fetching prayer times for date: ${date}, location: ${location.latitude},${location.longitude}`);
        
        // Use Al Adhan API to get prayer times
        // Method 1 = University of Islamic Sciences, Karachi (Hanafi)
        // Method 2 = Islamic Society of North America (ISNA)
        const calculationMethod = isHanafiMethod ? 1 : 2;
        
        const response = await axios.get(
          `https://api.aladhan.com/v1/timings/${date}`, {
            params: {
              latitude: location.latitude,
              longitude: location.longitude,
              method: calculationMethod,
              tune: "0,0,0,0,0,0,0,0,0"
            }
          }
        );

        const { data } = response;
        if (data && data.code === 200) {
          const timings = data.data.timings;
          const prayers: PrayerTime[] = [];

          // Process and add each prayer time
          Object.entries(timings).forEach(([name, timeStr]) => {
            if (prayerDisplayNames[name.toLowerCase()]) {
              const timeString = String(timeStr); // Convert to string explicitly
              const [hours, minutes] = timeString.split(':').map(Number);
              const time = new Date();
              time.setHours(hours, minutes, 0, 0);

              const displayInfo = prayerDisplayNames[name.toLowerCase()];

              prayers.push({
                name: name.toLowerCase(),
                time,
                displayName: displayInfo.displayName,
                arabicName: displayInfo.arabicName
              });
            }
          });

          // Sort prayers by time
          prayers.sort((a, b) => a.time.getTime() - b.time.getTime());
          setPrayerTimes(prayers);

          // Calculate Hijri date
          if (data.data.date.hijri) {
            const hijri = data.data.date.hijri;
            try {
              // Get the API-provided month name
              const apiMonthName = hijri.month.en;
              // Use our mapping to get the correct month name, or fallback to the API name
              const correctMonthName = hijriMonthNames[apiMonthName] || apiMonthName;
              
              // Format the day with ordinal suffix
              const day = parseInt(hijri.day);
              let daySuffix = "th";
              if (day === 1 || day === 21 || day === 31) daySuffix = "st";
              else if (day === 2 || day === 22) daySuffix = "nd";
              else if (day === 3 || day === 23) daySuffix = "rd";
              
              // Format full Hijri date
              setHijriDate(`${day}${daySuffix} ${correctMonthName} ${hijri.year} AH`);
              
              console.log("API returned month name:", apiMonthName, "Mapped to:", correctMonthName);
            } catch (error) {
              console.error("Error parsing Hijri date:", error);
              // Fallback to basic format if any error occurs
              setHijriDate(`${hijri.day} ${hijri.month.en} ${hijri.year} AH`);
            }
          } else {
            // Clear Hijri date if not available
            setHijriDate("");
          }

          // Get twilight info using SunCalc
          const sunTimes = SunCalc.getTimes(
            today,
            location.latitude,
            location.longitude
          );

          setTwilightInfo({
            astronomicalDawn: sunTimes.nightEnd,
            nauticalDawn: sunTimes.nauticalDawn,
            civilDawn: sunTimes.dawn,
            sunrise: sunTimes.sunrise,
            solarNoon: sunTimes.solarNoon,
            sunset: sunTimes.sunset,
            civilDusk: sunTimes.dusk,
            nauticalDusk: sunTimes.nauticalDusk,
            astronomicalDusk: sunTimes.night
          });

          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching prayer times:', error);
        setLoading(false);
      }
    };

    fetchPrayerTimes();
  }, [location, isHanafiMethod]);

  // Update current time every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Update current prayer and next prayer based on current time
  useEffect(() => {
    if (prayerTimes.length === 0) return;

    // Find current prayer and next prayer
    let current = "";
    let next: PrayerTime | null = null;

    for (let i = 0; i < prayerTimes.length; i++) {
      if (currentTime < prayerTimes[i].time) {
        next = prayerTimes[i];
        if (i === 0) {
          // Before first prayer of the day
          current = "night";
        } else {
          current = prayerTimes[i - 1].name;
        }
        break;
      }
    }

    // If we're after the last prayer of the day
    if (!next) {
      current = prayerTimes[prayerTimes.length - 1].name;
      // Next prayer will be Fajr of the next day (approximation)
      const tomorrow = new Date(currentTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(prayerTimes[0].time.getHours(), prayerTimes[0].time.getMinutes(), 0, 0);

      next = {
        ...prayerTimes[0],
        time: tomorrow
      };
    }

    setCurrentPrayer(current);
    setNextPrayer(next);

    // Calculate time remaining until next prayer
    if (next) {
      const diff = next.time.getTime() - currentTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeToNextPrayer(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }
  }, [currentTime, prayerTimes]);

  // Helper function to draw the time gradient with prayer time divisions
  const drawTimeGradient = useCallback((
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    twilight: TwilightInfo,
    prayers: PrayerTime[]
  ) => {
    // Calculate angle for a time - INVERTED for upside-down clock
    const timeToAngle = (time: Date) => {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      // Convert to angle (24 hours = 360 degrees, INVERTED orientation with 12 at bottom)
      return ((totalMinutes / (24 * 60)) * 360 + 90) * Math.PI / 180;
    };

    // Helper to create specific time angle for the daytime gradients
    const getTimeAngle = (hour: number, minute: number = 0) => {
      const today = new Date();
      today.setHours(hour, minute, 0, 0);
      return timeToAngle(today);
    };

    // Fill the entire circle with white background (inverting the scheme)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff'; // Pure white for background
    ctx.fill();

    // Get all the angles we need for the various visualizations
    // Day/night cycle
    const dayStartAngle = timeToAngle(twilight.sunrise);
    const dayEndAngle = timeToAngle(twilight.sunset);
    
    // Prayer times
    const fajrTime = prayers.find(p => p.name === 'fajr')?.time;
    const fajrAngle = fajrTime ? timeToAngle(fajrTime) : null;
    
    const dhuhrTime = prayers.find(p => p.name === 'dhuhr')?.time;
    const dhuhrAngle = dhuhrTime ? timeToAngle(dhuhrTime) : null;
    
    const asrTime = prayers.find(p => p.name === 'asr')?.time;
    const asrAngle = asrTime ? timeToAngle(asrTime) : null;
    
    const maghribTime = prayers.find(p => p.name === 'maghrib')?.time;
    const maghribAngle = maghribTime ? timeToAngle(maghribTime) : dayEndAngle;
    
    const ishaTime = prayers.find(p => p.name === 'isha')?.time;
    const ishaAngle = ishaTime ? timeToAngle(ishaTime) : null;
    
    // Create daytime gradient segments - from sunrise to maghrib
    if (dayStartAngle < maghribAngle) {
      // Pre-dawn period: Deep blue-purple (Fajr to Sunrise)
      if (fajrAngle !== null && fajrAngle < dayStartAngle) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, fajrAngle, dayStartAngle);
        ctx.closePath();
        ctx.fillStyle = 'rgba(45, 10, 80, 0.35)'; // Deep blue-purple
        ctx.fill();
      }
      
      // Sunrise to Dhuhr: Yellow-white gradient
      if (dhuhrAngle !== null && dayStartAngle < dhuhrAngle) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, dayStartAngle, dhuhrAngle);
        ctx.closePath();
        
        // Create a gradient that transitions from light yellow to white
        const gradient = ctx.createConicGradient(dayStartAngle, centerX, centerY);
        gradient.addColorStop(0, 'rgba(255, 248, 200, 0.35)'); // Light yellow
        gradient.addColorStop(0.5, 'rgba(255, 252, 245, 0.4)'); // Near white in the middle
        gradient.addColorStop(1, 'rgba(255, 250, 230, 0.35)'); // Slightly yellow-white
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      // 4. Dhuhr to Asr: Bright yellow/white
      if (dhuhrAngle !== null && asrAngle !== null && dhuhrAngle < asrAngle) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, dhuhrAngle, asrAngle);
        ctx.closePath();
        
        // Create a gradient that is bright yellow/white
        const gradient = ctx.createConicGradient(dhuhrAngle, centerX, centerY);
        gradient.addColorStop(0, 'rgba(255, 255, 240, 0.45)'); // Very bright yellow-white
        gradient.addColorStop(0.5, 'rgba(255, 255, 250, 0.5)'); // Almost pure white in the middle
        gradient.addColorStop(1, 'rgba(255, 255, 230, 0.45)'); // Back to bright yellow-white
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      // 5. Asr to Maghrib: Stronger Yellow-orange
      if (asrAngle !== null && asrAngle < maghribAngle) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, asrAngle, maghribAngle);
        ctx.closePath();
        
        // Create a gradient that transitions from light yellow-orange to stronger yellow-orange
        const gradient = ctx.createConicGradient(asrAngle, centerX, centerY);
        gradient.addColorStop(0, 'rgba(255, 215, 140, 0.4)'); // Light yellow-orange
        gradient.addColorStop(1, 'rgba(255, 173, 51, 0.5)'); // Stronger yellow-orange/amber
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      // Add Maghrib to Isha: Red-purple gradient
      if (ishaAngle !== null && maghribAngle < ishaAngle) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, maghribAngle, ishaAngle);
        ctx.closePath();
        
        // Create a gradient that transitions from red-purple to darker purple
        const gradient = ctx.createConicGradient(maghribAngle, centerX, centerY);
        gradient.addColorStop(0, 'rgba(139, 0, 139, 0.4)'); // Dark magenta/red-purple
        gradient.addColorStop(1, 'rgba(88, 28, 135, 0.5)'); // Transition to the darker purple used for night
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    } else {
      // Handle case where sunrise and maghrib angles cross the 0/360 boundary
      // This is unlikely in reality, but we should handle it for completeness
      console.log("Day crosses boundary - unusual case");
      
      // Handle pre-dawn period even in this special case
      if (fajrAngle !== null && fajrAngle < dayStartAngle) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, fajrAngle, dayStartAngle);
        ctx.closePath();
        ctx.fillStyle = 'rgba(45, 10, 80, 0.35)'; // Deep blue-purple
        ctx.fill();
      }
      
      // Handle Sunrise to Dhuhr in the boundary crossing case
      if (dhuhrAngle !== null && dayStartAngle < dhuhrAngle) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, dayStartAngle, dhuhrAngle);
        ctx.closePath();
        
        // Create a gradient that transitions from light yellow to white
        const gradient = ctx.createConicGradient(dayStartAngle, centerX, centerY);
        gradient.addColorStop(0, 'rgba(255, 248, 200, 0.35)'); // Light yellow
        gradient.addColorStop(0.5, 'rgba(255, 252, 245, 0.4)'); // Near white in the middle
        gradient.addColorStop(1, 'rgba(255, 250, 230, 0.35)'); // Slightly yellow-white
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      // Handle Dhuhr to Asr in the boundary crossing case
      if (dhuhrAngle !== null && asrAngle !== null && dhuhrAngle < asrAngle) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, dhuhrAngle, asrAngle);
        ctx.closePath();
        
        const gradient = ctx.createConicGradient(dhuhrAngle, centerX, centerY);
        gradient.addColorStop(0, 'rgba(255, 255, 240, 0.45)'); // Very bright yellow-white
        gradient.addColorStop(0.5, 'rgba(255, 255, 250, 0.5)'); // Almost pure white in the middle
        gradient.addColorStop(1, 'rgba(255, 255, 230, 0.45)'); // Back to bright yellow-white
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      // Handle Asr to Maghrib in the boundary crossing case
      if (asrAngle !== null && asrAngle < maghribAngle) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, asrAngle, maghribAngle);
        ctx.closePath();
        
        const gradient = ctx.createConicGradient(asrAngle, centerX, centerY);
        gradient.addColorStop(0, 'rgba(255, 215, 140, 0.4)'); // Light yellow-orange
        gradient.addColorStop(1, 'rgba(255, 173, 51, 0.5)'); // Stronger yellow-orange/amber
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      // Handle Maghrib to Isha in the boundary crossing case
      if (ishaAngle !== null && maghribAngle < ishaAngle) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, maghribAngle, ishaAngle);
        ctx.closePath();
        
        const gradient = ctx.createConicGradient(maghribAngle, centerX, centerY);
        gradient.addColorStop(0, 'rgba(139, 0, 139, 0.4)'); // Dark magenta/red-purple
        gradient.addColorStop(1, 'rgba(88, 28, 135, 0.5)'); // Transition to the darker purple used for night
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }
    
    // Night period between Isha and Fajr - add darker purple gradient
    if (ishaAngle !== null && fajrAngle !== null) {
      // If Fajr angle is less than Isha angle, it means Fajr is on the next day
      // We need to adjust the gradient to cover the night period correctly
      if (ishaAngle > fajrAngle) {
        // Draw very dark blue with hint of purple gradient for night period
        const gradient = ctx.createConicGradient(ishaAngle, centerX, centerY);
        gradient.addColorStop(0, 'rgba(25, 25, 70, 0.55)'); // Very dark blue with hint of purple at Isha
        gradient.addColorStop(0.5, 'rgba(10, 10, 40, 0.65)'); // Deeper blue-purple for middle of night
        gradient.addColorStop(1, 'rgba(25, 25, 70, 0.55)'); // Back to very dark blue with hint of purple at Fajr
        
        // Draw a sector for night period
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, ishaAngle, fajrAngle + 2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      } else {
        // Handle the case where angles cross the 0/360 boundary
        // First draw from Isha to the end (2*PI)
        const gradient1 = ctx.createConicGradient(ishaAngle, centerX, centerY);
        gradient1.addColorStop(0, 'rgba(25, 25, 70, 0.55)'); // Very dark blue with hint of purple
        gradient1.addColorStop(1, 'rgba(10, 10, 40, 0.65)'); // Deeper blue-purple
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, ishaAngle, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = gradient1;
        ctx.fill();
        
        // Then from start (0) to Fajr
        const gradient2 = ctx.createConicGradient(0, centerX, centerY);
        gradient2.addColorStop(0, 'rgba(10, 10, 40, 0.65)'); // Deeper blue-purple
        gradient2.addColorStop(1, 'rgba(25, 25, 70, 0.55)'); // Very dark blue with hint of purple
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, 0, fajrAngle);
        ctx.closePath();
        ctx.fillStyle = gradient2;
        ctx.fill();
      }
    }
    
    // Get ordered prayer times to create sectors
    // We need all 5 prayers: Fajr, Dhuhr, Asr, Maghrib, Isha
    const prayerTimes = [
      fajrTime,
      prayers.find(p => p.name === 'dhuhr')?.time,
      prayers.find(p => p.name === 'asr')?.time,
      maghribTime,
      ishaTime,
    ];

    // Add tomorrow's Fajr to complete the 24-hour cycle
    if (prayerTimes[0]) {
      const tomorrow = new Date(prayerTimes[0]);
      tomorrow.setDate(tomorrow.getDate() + 1);
      prayerTimes.push(tomorrow);
    }

    // Draw dividing lines for prayer times and mark prayers
    const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Fajr'];
    
    prayerTimes.forEach((time, index) => {
      if (!time) return;
      
      const angle = timeToAngle(time);
      
      // Check if this prayer time falls during day or night
      const isDaytime = isAngleBetween(angle, dayStartAngle, dayEndAngle);
      
      // Draw line from center to edge with appropriate color
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle)
      );
      
      // Use black for all lines since background is white
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Add a small marker at each prayer time
      const markerDistance = radius - 10;
      const markerX = centerX + markerDistance * Math.cos(angle);
      const markerY = centerY + markerDistance * Math.sin(angle);
      
      ctx.beginPath();
      ctx.arc(markerX, markerY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#000000'; // Black markers for all
      ctx.fill();
      
      // Add tiny prayer label (first letter only for minimalism)
      if (index < prayerNames.length) {
        const labelDistance = radius - 25;
        const labelX = centerX + labelDistance * Math.cos(angle);
        const labelY = centerY + labelDistance * Math.sin(angle);
        
        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = '#000000'; // Black text for all
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(prayerNames[index][0], labelX, labelY); // Just the first letter
      }
    });
    
    // Specifically mark sunrise with a distinct symbol/color
    // Draw sunrise line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + radius * Math.cos(dayStartAngle),
      centerY + radius * Math.sin(dayStartAngle)
    );
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.9)'; // Orange for sunrise
    ctx.lineWidth = 2; // Slightly thicker
    ctx.stroke();
    
    // Add special sunrise marker
    const sunriseMarkerDistance = radius - 10;
    const sunriseX = centerX + sunriseMarkerDistance * Math.cos(dayStartAngle);
    const sunriseY = centerY + sunriseMarkerDistance * Math.sin(dayStartAngle);
    
    // Draw sunshine marker
    ctx.beginPath();
    ctx.arc(sunriseX, sunriseY, 5, 0, 2 * Math.PI); // Slightly larger
    ctx.fillStyle = '#FFA500'; // Orange
    ctx.fill();
    
    // Add label for sunrise
    const sunriseLabelDistance = radius - 25;
    const sunriseLabelX = centerX + sunriseLabelDistance * Math.cos(dayStartAngle);
    const sunriseLabelY = centerY + sunriseLabelDistance * Math.sin(dayStartAngle);
    
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#FFA500'; // Orange text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', sunriseLabelX, sunriseLabelY); // 'S' for Sunrise

    // Specifically mark Maghrib (sunset) with a moon symbol
    if (maghribTime) {
      // Draw maghrib line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + radius * Math.cos(maghribAngle),
        centerY + radius * Math.sin(maghribAngle)
      );
      ctx.strokeStyle = 'rgba(100, 149, 237, 0.9)'; // Cornflower blue for maghrib/moonlight
      ctx.lineWidth = 2; // Slightly thicker
      ctx.stroke();
      
      // Add moon marker for Maghrib
      const moonMarkerDistance = radius - 10;
      const moonX = centerX + moonMarkerDistance * Math.cos(maghribAngle);
      const moonY = centerY + moonMarkerDistance * Math.sin(maghribAngle);
      
      // Draw crescent moon shape
      const moonSize = 6;
      
      // Full circle for the base
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonSize, 0, 2 * Math.PI);
      ctx.fillStyle = '#4682B4'; // Steel blue
      ctx.fill();
      
      // Offset circle to create crescent effect
      ctx.beginPath();
      ctx.arc(moonX + 3, moonY, moonSize - 1, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      // Add "M" label for Maghrib near the moon
      const moonLabelDistance = radius - 25;
      const moonLabelX = centerX + moonLabelDistance * Math.cos(maghribAngle);
      const moonLabelY = centerY + moonLabelDistance * Math.sin(maghribAngle);
      
      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = '#4682B4'; // Same blue as the moon
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('M', moonLabelX, moonLabelY); // 'M' for Maghrib
    }

    // Helper function to check if an angle is between two other angles
    function isAngleBetween(angle: number, startAngle: number, endAngle: number): boolean {
      // Normalize angles to 0-2π range
      const normalizeAngle = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      
      const normAngle = normalizeAngle(angle);
      const normStart = normalizeAngle(startAngle);
      const normEnd = normalizeAngle(endAngle);
      
      if (normStart <= normEnd) {
        return normAngle >= normStart && normAngle <= normEnd;
      } else {
        // Handle case where range crosses 0 (e.g., from 11PM to 6AM)
        return normAngle >= normStart || normAngle <= normEnd;
      }
    }
  }, []);

  // Helper function to draw current time indicator - red marker
  const drawCurrentTimeIndicator = useCallback((
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    time: Date
  ) => {
    const hours = time.getHours();
    const minutes = time.getMinutes();

    // Calculate angle for smooth movement - INVERTED for upside-down clock
    const totalMinutes = hours * 60 + minutes;
    const angle = ((totalMinutes / (24 * 60)) * 2 * Math.PI) + Math.PI / 2; // Start from bottom (inverted)
    
    // Draw a black circle in the center for better visibility - increased by 50%
    const centerRadius = radius * 0.225; // 22.5% of the clock's radius (50% larger than before)
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Draw thin white border around center black circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Draw red time indicator line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + radius * Math.cos(angle),
      centerY + radius * Math.sin(angle)
    );
    ctx.strokeStyle = '#ff0000'; // Red
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Add a red dot at the end of time indicator
    const dotX = centerX + radius * Math.cos(angle);
    const dotY = centerY + radius * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff0000';
    ctx.fill();
    
    // Add white dot in the center of black circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }, []);

  // Draw the circular visualization - ultra minimal with prayer time divisions
  useEffect(() => {
    if (!canvasRef.current || !twilightInfo || prayerTimes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw just an ultra-thin outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Changed to black with opacity for better visibility on white
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Draw background for day/night cycle with prayer time divisions
    drawTimeGradient(ctx, centerX, centerY, radius, twilightInfo, prayerTimes);

    // Draw current time indicator - just a line
    drawCurrentTimeIndicator(ctx, centerX, centerY, radius, currentTime);

  }, [currentTime, prayerTimes, twilightInfo, size, drawTimeGradient, drawCurrentTimeIndicator]);

  // Format prayer time for display
  const formatPrayerTime = (time: Date) => {
    return time.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format current time
  const formattedCurrentTime = () => {
    return currentTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format current date
  const formattedCurrentDate = () => {
    return currentTime.toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  // Method switch handler
  const toggleCalculationMethod = () => {
    setIsHanafiMethod(!isHanafiMethod);
  };

  // Handle manual location submission with coordinates
  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (locationType === "coordinates") {
      const lat = parseFloat(manualLatitude);
      const lng = parseFloat(manualLongitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        setLocation({
          latitude: lat,
          longitude: lng
        });
        setUsingDefaultLocation(false);
        setShowLocationInput(false);
        setLoading(true); // Trigger refetch of prayer times
      }
    } else if (locationType === "cityCountry" && city && country) {
      // Geocode the city and country
      setGeocodingError("");
      setLoading(true);
      
      // Use OpenStreetMap Nominatim API to geocode
      const query = `${city}, ${country}`;
      axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 1,
        },
        headers: {
          'User-Agent': 'Prayer Times App' // Nominatim requires a User-Agent header
        }
      })
      .then(response => {
        if (response.data && response.data.length > 0) {
          const result = response.data[0];
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);
          
          setLocation({
            latitude: lat,
            longitude: lon
          });
          setManualLatitude(lat.toString());
          setManualLongitude(lon.toString());
          setUsingDefaultLocation(false);
          setShowLocationInput(false);
        } else {
          setGeocodingError(`Location "${query}" not found. Please check spelling or try another city.`);
          setLoading(false);
        }
      })
      .catch(error => {
        console.error("Geocoding error:", error);
        setGeocodingError("Failed to find location. Please try again or use coordinates.");
        setLoading(false);
      });
    }
  };

  return (
    <Card className="premium-card w-full max-w-4xl mx-auto shadow-sm overflow-hidden">
      <div className="premium-card-inner relative">
        {/* Content */}
        <div className="relative z-10">
          {/* App Title */}
          <h1 className="premium-app-title">Prayer Times Visualization</h1>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="h-16 w-16 rounded-full border-2 premium-spinner animate-spin mb-4"></div>
              <p className="text-black">Loading prayer times...</p>
            </div>
          ) : (
            <>
              {/* Location Notice */}
              {usingDefaultLocation && (
                <div className="premium-location-notice mb-4">
                  <p>Using default location (Mecca) because: {locationErrorMessage}</p>
                  <p className="mt-1">Prayer times may not be accurate for your location.</p>
                  <button 
                    onClick={() => setShowLocationInput(!showLocationInput)}
                    className="premium-location-link"
                  >
                    {showLocationInput ? 'Hide location form' : 'Set location manually'}
                  </button>
                  
                  {showLocationInput && (
                    <form onSubmit={handleManualLocationSubmit} className="premium-location-form mt-2 flex flex-col space-y-3">
                      {/* Input type selector */}
                      <div className="premium-button-group">
                        <button
                          type="button"
                          onClick={() => setLocationType("coordinates")}
                          className={`premium-button ${locationType === "coordinates" ? "premium-button-active" : ""}`}
                        >
                          Coordinates
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationType("cityCountry")}
                          className={`premium-button ${locationType === "cityCountry" ? "premium-button-active" : ""}`}
                        >
                          City & Country
                        </button>
                      </div>
                      
                      {locationType === "coordinates" ? (
                        <div className="flex space-x-2">
                          <div className="w-1/2">
                            <label htmlFor="latitude" className="premium-input-label">Latitude</label>
                            <input
                              id="latitude"
                              type="text"
                              value={manualLatitude}
                              onChange={(e) => setManualLatitude(e.target.value)}
                              placeholder="e.g. 51.5074"
                              className="premium-input"
                              required
                            />
                          </div>
                          <div className="w-1/2">
                            <label htmlFor="longitude" className="premium-input-label">Longitude</label>
                            <input
                              id="longitude"
                              type="text"
                              value={manualLongitude}
                              onChange={(e) => setManualLongitude(e.target.value)}
                              placeholder="e.g. -0.1278"
                              className="premium-input"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <div className="w-1/2">
                            <label htmlFor="city" className="premium-input-label">City</label>
                            <input
                              id="city"
                              type="text"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="e.g. London"
                              className="premium-input"
                              required
                            />
                          </div>
                          <div className="w-1/2">
                            <label htmlFor="country" className="premium-input-label">Country</label>
                            <input
                              id="country"
                              type="text"
                              value={country}
                              onChange={(e) => setCountry(e.target.value)}
                              placeholder="e.g. UK"
                              className="premium-input"
                              required
                            />
                          </div>
                        </div>
                      )}
                      
                      {geocodingError && (
                        <p className="text-xs text-red-600">{geocodingError}</p>
                      )}
                      
                      <button 
                        type="submit"
                        className="premium-submit-button self-start"
                      >
                        Update Location
                      </button>
                    </form>
                  )}
                </div>
              )}
            
              {/* Option to manually set location even if we're not using default */}
              {!usingDefaultLocation && !showLocationInput && (
                <div className="mb-4 text-center">
                  <button 
                    onClick={() => setShowLocationInput(true)}
                    className="premium-location-link"
                  >
                    Change location
                  </button>
                </div>
              )}
              
              {/* Location input for non-default case */}
              {!usingDefaultLocation && showLocationInput && (
                <div className="premium-location-form mb-4">
                  <form onSubmit={handleManualLocationSubmit} className="flex flex-col space-y-3">
                    {/* Input type selector */}
                    <div className="premium-button-group">
                      <button
                        type="button"
                        onClick={() => setLocationType("coordinates")}
                        className={`premium-button ${locationType === "coordinates" ? "premium-button-active" : ""}`}
                      >
                        Coordinates
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationType("cityCountry")}
                        className={`premium-button ${locationType === "cityCountry" ? "premium-button-active" : ""}`}
                      >
                        City & Country
                      </button>
                    </div>
                    
                    {locationType === "coordinates" ? (
                      <div className="flex space-x-2">
                        <div className="w-1/2">
                          <label htmlFor="latitude2" className="premium-input-label">Latitude</label>
                          <input
                            id="latitude2"
                            type="text"
                            value={manualLatitude}
                            onChange={(e) => setManualLatitude(e.target.value)}
                            placeholder="e.g. 51.5074"
                            className="premium-input"
                            required
                          />
                        </div>
                        <div className="w-1/2">
                          <label htmlFor="longitude2" className="premium-input-label">Longitude</label>
                          <input
                            id="longitude2"
                            type="text"
                            value={manualLongitude}
                            onChange={(e) => setManualLongitude(e.target.value)}
                            placeholder="e.g. -0.1278"
                            className="premium-input"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <div className="w-1/2">
                          <label htmlFor="city2" className="premium-input-label">City</label>
                          <input
                            id="city2"
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. London"
                            className="premium-input"
                            required
                          />
                        </div>
                        <div className="w-1/2">
                          <label htmlFor="country2" className="premium-input-label">Country</label>
                          <input
                            id="country2"
                            type="text"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="e.g. UK"
                            className="premium-input"
                            required
                          />
                        </div>
                      </div>
                    )}
                    
                    {geocodingError && (
                      <p className="text-xs text-red-600">{geocodingError}</p>
                    )}
                    
                    <div className="flex space-x-2">
                      <button 
                        type="submit"
                        className="premium-submit-button"
                      >
                        Update Location
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowLocationInput(false)}
                        className="premium-cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            
              {/* Time Header - Premium design */}
              <div className="mb-6 text-center premium-fade-in">
                <h2 className="premium-time">
                  {formattedCurrentTime()}
                </h2>
                <p className="premium-date">{formattedCurrentDate()}</p>
                {hijriDate && (
                  <p className="premium-hijri-date">
                    {hijriDate}
                  </p>
                )}
              </div>
  
              {/* Method Toggle */}
              <div className="flex justify-center items-center mb-6">
                <div className="premium-button-group">
                  <button
                    className={`premium-button ${!isHanafiMethod ? "premium-button-active" : ""}`}
                    onClick={toggleCalculationMethod}
                  >
                    Standard
                  </button>
                  <button
                    className={`premium-button ${isHanafiMethod ? "premium-button-active" : ""}`}
                    onClick={toggleCalculationMethod}
                  >
                    Hanafi
                  </button>
                </div>
              </div>
  
              {/* Circular Visualization */}
              <div className="premium-clock-container mx-auto" style={{ width: size, height: size }}>
                <div ref={clockRef} className="relative w-full h-full">
                  <canvas
                    ref={canvasRef}
                    width={size}
                    height={size}
                    className="absolute inset-0"
                  />
                </div>
              </div>
              
              {/* Prayer Times Grid */}
              <div className="premium-prayer-list">
                {prayerTimes.map((prayer) => (
                  <div key={prayer.name} className={`premium-prayer-item ${currentPrayer === prayer.name ? 'premium-pulsate' : ''}`}>
                    <div className="premium-prayer-item-name">{prayer.displayName}</div>
                    <div className="premium-prayer-item-time">{formatPrayerTime(prayer.time)}</div>
                  </div>
                ))}
              </div>
              
              {/* Next prayer time with countdown */}
              <div className="premium-next-prayer">
                <div className="premium-next-prayer-title">Next Prayer</div>
                <div className="premium-next-prayer-info">
                  {nextPrayer?.displayName} at {nextPrayer && formatPrayerTime(nextPrayer.time)}
                </div>
                {nextPrayer && (
                  <div className="premium-next-prayer-countdown">
                    Time remaining: {timeToNextPrayer}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
