import axios from 'axios';

export interface PrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export interface TwilightPeriods {
  astronomicalDawn: Date; // Beginning of astronomical twilight in the morning
  nauticalDawn: Date; // Beginning of nautical twilight in the morning
  civilDawn: Date; // Beginning of civil twilight in the morning (close to Fajr)
  sunrise: Date;
  solarNoon: Date; // When the sun is at its highest point
  sunset: Date;
  civilDusk: Date; // End of civil twilight in the evening (close to Maghrib)
  nauticalDusk: Date; // End of nautical twilight in the evening
  astronomicalDusk: Date; // End of astronomical twilight in the evening
}

export interface DayPeriodInfo {
  name: string;
  startTime: Date;
  endTime: Date;
  color: string;
}

// Using the SunriseSunset API to get accurate twilight information
export async function getTwilightPeriods(latitude: number, longitude: number): Promise<TwilightPeriods> {
  try {
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

    const response = await axios.get(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${formattedDate}&formatted=0`
    );

    const data = response.data.results;

    return {
      astronomicalDawn: new Date(data.astronomical_twilight_begin),
      nauticalDawn: new Date(data.nautical_twilight_begin),
      civilDawn: new Date(data.civil_twilight_begin),
      sunrise: new Date(data.sunrise),
      solarNoon: new Date(data.solar_noon),
      sunset: new Date(data.sunset),
      civilDusk: new Date(data.civil_twilight_end),
      nauticalDusk: new Date(data.nautical_twilight_end),
      astronomicalDusk: new Date(data.astronomical_twilight_end)
    };
  } catch (error) {
    console.error('Error fetching twilight periods:', error);
    throw new Error('Failed to fetch twilight periods');
  }
}

// Calculate prayer times based on twilight periods and astronomical data
export function calculatePrayerTimes(latitude: number, longitude: number, twilightPeriods?: TwilightPeriods | null): PrayerTimes {
  // If we have twilight periods, we'll use them for more accuracy
  if (twilightPeriods) {
    const date = new Date();

    // Calculate dhuhr (solar noon)
    const dhuhrTime = new Date(twilightPeriods.solarNoon);

    // Fajr: Standard is 18° below horizon, but can be adjusted per location
    // Most calculation methods use angles between 15° and 19°
    const fajrTime = new Date(twilightPeriods.astronomicalDawn); 
    // Apply regional adjustments for more accuracy
    const fajrAdjustment = getFajrAdjustment(latitude);
    fajrTime.setMinutes(fajrTime.getMinutes() + fajrAdjustment);

    // Sunrise directly from twilight data
    const sunriseTime = new Date(twilightPeriods.sunrise);

    // Asr: when the shadow of an object becomes equal to its height plus the shadow length at noon
    // This varies by madhab (school of thought)
    // Shafi, Maliki, Hanbali use shadow = height + noon shadow (factor 1)
    // Hanafi uses shadow = 2 * height + noon shadow (factor 2)
    const asrFactor = 1; // Default to Shafi/Maliki/Hanbali method
    const asrTime = calculateAsrTime(dhuhrTime, latitude, date, asrFactor);

    // Maghrib is at sunset
    const maghribTime = new Date(twilightPeriods.sunset);

    // Isha: Standard is 17° below horizon after sunset, but can be adjusted
    // Most calculation methods use angles between 15° and 18°
    const ishaTime = new Date(twilightPeriods.astronomicalDusk);
    // Apply regional adjustments for more accuracy
    const ishaAdjustment = getIshaAdjustment(latitude);
    ishaTime.setMinutes(ishaTime.getMinutes() + ishaAdjustment);

    return {
      fajr: fajrTime,
      sunrise: sunriseTime,
      dhuhr: dhuhrTime,
      asr: asrTime,
      maghrib: maghribTime,
      isha: ishaTime
    };
  }

  // If no twilight data, fallback to our formula-based calculation
  return calculatePrayerTimesFormula(latitude, longitude);
}

// Helper function to calculate Asr time based on shadow factor
function calculateAsrTime(
  dhuhrTime: Date, 
  latitude: number, 
  date: Date,
  factor: number = 1
): Date {
  const dayOfYear = getDayOfYear(date);
  const declination = getSunDeclination(dayOfYear);
  
  // Calculate the angle when shadow length = factor * object height + noon shadow
  const asrAngle = Math.atan(1 / (factor + Math.tan(Math.abs(latitude - declination) * Math.PI / 180)));
  
  // Convert to hours
  const asrOffset = asrAngle * 180 / Math.PI / 15; // Convert angle to hours
  
  // Apply to dhuhr time
  const asrTime = new Date(dhuhrTime);
  asrTime.setHours(asrTime.getHours() + asrOffset);
  
  return asrTime;
}

// Get Fajr adjustment based on latitude (different regions use different standards)
function getFajrAdjustment(latitude: number): number {
  const absLat = Math.abs(latitude);
  
  // Polar regions need special handling
  if (absLat > 65) {
    return -20; // Special calculation for extreme latitudes
  }
  
  // Middle East / North Africa region (adjust for earlier Fajr)
  if (absLat < 30 && absLat > 15) {
    return -10;
  }
  
  // Default adjustment
  return -5;
}

// Get Isha adjustment based on latitude (different regions use different standards)
function getIshaAdjustment(latitude: number): number {
  const absLat = Math.abs(latitude);
  
  // Polar regions need special handling
  if (absLat > 65) {
    return 20; // Special calculation for extreme latitudes
  }
  
  // Middle East / North Africa region
  if (absLat < 30 && absLat > 15) {
    return 10;
  }
  
  // Default adjustment
  return 5;
}

// Helper function to adjust times based on season
function calculateSeasonalFactor(date: Date, latitude: number): number {
  const month = date.getMonth(); // 0-11
  const absLatitude = Math.abs(latitude);

  // Summer months in Northern hemisphere (or winter in Southern)
  if ((latitude >= 0 && (month >= 4 && month <= 8)) ||
      (latitude < 0 && (month <= 2 || month >= 9))) {
    // Longer days - Asr is later
    return absLatitude > 40 ? 1 : 0.5;
  }
  // Winter months in Northern hemisphere (or summer in Southern)
  else if ((latitude >= 0 && (month <= 2 || month >= 9)) ||
           (latitude < 0 && (month >= 4 && month <= 8))) {
    // Shorter days - Asr is earlier
    return absLatitude > 40 ? -1 : -0.5;
  }

  return 0; // Spring/Fall or near equator
}

// Original formula-based calculation as fallback
function calculatePrayerTimesFormula(latitude: number, longitude: number, date = new Date()): PrayerTimes {
  // Get timezone offset in hours
  const timezoneOffset = -date.getTimezoneOffset() / 60;

  // Use the twilight data to estimate prayer times
  // These calculations are approximations
  const dayOfYear = getDayOfYear(date);
  const declination = getSunDeclination(dayOfYear);
  const equation = getEquationOfTime(dayOfYear);

  // Calculate Dhuhr time (solar noon)
  const dhuhrHours = 12 + timezoneOffset - longitude / 15 - equation / 60;
  const dhuhrDate = new Date(date);
  dhuhrDate.setHours(Math.floor(dhuhrHours), Math.round((dhuhrHours % 1) * 60), 0, 0);

  // Calculate sunrise and sunset
  const T = calculateSunriseSunsetHourAngle(latitude, declination, 90.833);
  const sunriseHours = dhuhrHours - T / 15;
  const sunsetHours = dhuhrHours + T / 15;

  const sunriseDate = new Date(date);
  sunriseDate.setHours(Math.floor(sunriseHours), Math.round((sunriseHours % 1) * 60), 0, 0);

  const sunsetDate = new Date(date);
  sunsetDate.setHours(Math.floor(sunsetHours), Math.round((sunsetHours % 1) * 60), 0, 0);

  // Fajr angle: 18 degrees below horizon
  const fajrT = calculateSunriseSunsetHourAngle(latitude, declination, 108);
  const fajrHours = dhuhrHours - fajrT / 15;
  const fajrDate = new Date(date);
  fajrDate.setHours(Math.floor(fajrHours), Math.round((fajrHours % 1) * 60), 0, 0);

  // Asr calculation (standard is shadow length = object height * 1)
  const asrAngle = Math.atan(1 / (1 + Math.tan(Math.abs(latitude - declination) * Math.PI / 180)));
  const asrT = calculateSunriseSunsetHourAngle(latitude, declination, (90 - asrAngle * 180 / Math.PI));
  const asrHours = dhuhrHours + asrT / 15;
  const asrDate = new Date(date);
  asrDate.setHours(Math.floor(asrHours), Math.round((asrHours % 1) * 60), 0, 0);

  // Maghrib is at sunset
  const maghribDate = new Date(sunsetDate);

  // Isha angle: 17 degrees below horizon
  const ishaT = calculateSunriseSunsetHourAngle(latitude, declination, 107);
  const ishaHours = dhuhrHours + ishaT / 15;
  const ishaDate = new Date(date);
  ishaDate.setHours(Math.floor(ishaHours), Math.round((ishaHours % 1) * 60), 0, 0);

  return {
    fajr: fajrDate,
    sunrise: sunriseDate,
    dhuhr: dhuhrDate,
    asr: asrDate,
    maghrib: maghribDate,
    isha: ishaDate
  };
}

// Helper functions for prayer time calculations
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getSunDeclination(dayOfYear: number): number {
  return -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
}

function getEquationOfTime(dayOfYear: number): number {
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function calculateSunriseSunsetHourAngle(latitude: number, declination: number, zenith: number): number {
  const latRad = latitude * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  const zenithRad = zenith * Math.PI / 180;

  const hourAngle = Math.acos(
    (Math.cos(zenithRad) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad))
  );

  return hourAngle * 180 / Math.PI;
}

// Function to get the current prayer period
export function getCurrentPrayerPeriod(prayerTimes: PrayerTimes): string {
  const now = new Date();
  
  // Add buffer times for more accurate prayer period transitions (in minutes)
  const prayerStartBuffer = 10; // Minutes before the official time when prayer period begins
  
  // Create a function to check if we're in a prayer time with a buffer
  const isInPrayerTimeWithBuffer = (start: Date, end: Date): boolean => {
    const startWithBuffer = new Date(start);
    startWithBuffer.setMinutes(start.getMinutes() - prayerStartBuffer);
    return now >= startWithBuffer && now < end;
  };

  // Check if we're in the isha period (from isha until midnight)
  if (now >= prayerTimes.isha) {
    return 'isha';
  }
  
  // Check if we're in the maghrib period
  if (isInPrayerTimeWithBuffer(prayerTimes.maghrib, prayerTimes.isha)) {
    return 'maghrib';
  }
  
  // Check if we're in the asr period
  if (isInPrayerTimeWithBuffer(prayerTimes.asr, prayerTimes.maghrib)) {
    return 'asr';
  }
  
  // Check if we're in the dhuhr period
  if (isInPrayerTimeWithBuffer(prayerTimes.dhuhr, prayerTimes.asr)) {
    return 'dhuhr';
  }
  
  // Check if we're in the post-sunrise period
  if (isInPrayerTimeWithBuffer(prayerTimes.sunrise, prayerTimes.dhuhr)) {
    return 'sunrise';
  }
  
  // Check if we're in the fajr period
  if (isInPrayerTimeWithBuffer(prayerTimes.fajr, prayerTimes.sunrise)) {
    return 'fajr';
  }
  
  // If we're before fajr, we're in the night/tahajjud period
  return 'night';
}

// Function to get time remaining in current prayer period with improved accuracy
export function getTimeRemainingInPeriod(prayerTimes: PrayerTimes): number {
  const now = new Date();
  const currentPeriod = getCurrentPrayerPeriod(prayerTimes);

  switch (currentPeriod) {
    case 'fajr':
      return prayerTimes.sunrise.getTime() - now.getTime();
    case 'sunrise':
      return prayerTimes.dhuhr.getTime() - now.getTime();
    case 'dhuhr':
      return prayerTimes.asr.getTime() - now.getTime();
    case 'asr':
      return prayerTimes.maghrib.getTime() - now.getTime();
    case 'maghrib':
      return prayerTimes.isha.getTime() - now.getTime();
    case 'isha': {
      // Time until midnight
      const midnight = new Date(now);
      midnight.setHours(23, 59, 59, 999);
      return midnight.getTime() - now.getTime();
    }
    case 'night': {
      // Time until fajr
      return prayerTimes.fajr.getTime() - now.getTime();
    }
    default:
      return 0;
  }
}

// Function to get the next prayer time after the current period
export function getNextPrayer(prayerTimes: PrayerTimes): { name: string; time: Date } {
  const currentPeriod = getCurrentPrayerPeriod(prayerTimes);
  
  switch (currentPeriod) {
    case 'night':
      return { name: 'fajr', time: prayerTimes.fajr };
    case 'fajr':
      return { name: 'sunrise', time: prayerTimes.sunrise };
    case 'sunrise':
      return { name: 'dhuhr', time: prayerTimes.dhuhr };
    case 'dhuhr':
      return { name: 'asr', time: prayerTimes.asr };
    case 'asr':
      return { name: 'maghrib', time: prayerTimes.maghrib };
    case 'maghrib':
      return { name: 'isha', time: prayerTimes.isha };
    case 'isha': {
      // Next prayer is fajr of tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // We need to recalculate for tomorrow
      const tomorrowTimes = calculatePrayerTimesFormula(0, 0, tomorrow); // Location will be updated elsewhere
      return { name: 'fajr', time: tomorrowTimes.fajr };
    }
    default:
      return { name: 'fajr', time: prayerTimes.fajr };
  }
}

// Get all prayer periods with their respective colors for the 24-hour visualization
export function getDayPeriods(prayerTimes: PrayerTimes, twilightPeriods: TwilightPeriods): DayPeriodInfo[] {
  // Create a new date for next Fajr (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // We need to create a tomorrow instance to get tomorrow's fajr
  const tomorrowPrayerTimes = {
    ...prayerTimes,
    fajr: new Date(tomorrow)
  };
  tomorrowPrayerTimes.fajr.setHours(
    prayerTimes.fajr.getHours(),
    prayerTimes.fajr.getMinutes(),
    prayerTimes.fajr.getSeconds()
  );

  return [
    {
      name: 'Night',
      startTime: prayerTimes.isha,
      endTime: prayerTimes.fajr,
      color: 'rgb(30, 27, 75)' // Deep Indigo, more vibrant than before
    },
    {
      name: 'Fajr',
      startTime: prayerTimes.fajr,
      endTime: twilightPeriods.sunrise,
      color: 'rgb(79, 70, 229)' // Indigo, more vibrant
    },
    {
      name: 'Sunrise',
      startTime: twilightPeriods.sunrise,
      endTime: new Date(twilightPeriods.sunrise.getTime() + 60 * 60 * 1000), // 1 hour after sunrise
      color: 'rgb(96, 165, 250)' // Light Blue, more vibrant
    },
    {
      name: 'Morning',
      startTime: new Date(twilightPeriods.sunrise.getTime() + 60 * 60 * 1000),
      endTime: twilightPeriods.solarNoon,
      color: 'rgb(147, 197, 253)' // Sky Blue, more vibrant
    },
    {
      name: 'Dhuhr',
      startTime: twilightPeriods.solarNoon,
      endTime: prayerTimes.asr,
      color: 'rgb(191, 219, 254)' // Very Light Blue, more vibrant
    },
    {
      name: 'Asr',
      startTime: prayerTimes.asr,
      endTime: twilightPeriods.sunset,
      color: 'rgb(59, 130, 246)' // Blue
    },
    {
      name: 'Maghrib',
      startTime: twilightPeriods.sunset,
      endTime: prayerTimes.isha,
      color: 'rgb(67, 56, 202)' // Deeper Blue, more vibrant
    }
  ];
}

// Function to calculate the angle for a specific time in the 24-hour circle
export function calculateClockAngle(time: Date): number {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Convert to angle (24 hours = 360 degrees)
  return (totalMinutes / (24 * 60)) * 360;
}
