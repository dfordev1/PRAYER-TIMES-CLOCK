declare module 'suncalc' {
  interface SunTimes {
    sunrise: Date;
    sunset: Date;
    solarNoon: Date;

    dawn: Date; // civil dawn
    dusk: Date; // civil dusk

    nauticalDawn: Date;
    nauticalDusk: Date;

    nightEnd: Date; // astronomical dawn
    night: Date; // astronomical dusk

    goldenHourEnd: Date;
    goldenHour: Date;
  }

  interface MoonPosition {
    azimuth: number;
    altitude: number;
    distance: number;
    parallacticAngle: number;
  }

  interface MoonIllumination {
    fraction: number;
    phase: number;
    angle: number;
  }

  interface MoonTimes {
    rise: Date | null;
    set: Date | null;
    alwaysUp: boolean;
    alwaysDown: boolean;
  }

  function getTimes(date: Date, latitude: number, longitude: number): SunTimes;
  function getPosition(date: Date, latitude: number, longitude: number): { azimuth: number; altitude: number };
  function getMoonPosition(date: Date, latitude: number, longitude: number): MoonPosition;
  function getMoonIllumination(date: Date): MoonIllumination;
  function getMoonTimes(date: Date, latitude: number, longitude: number): MoonTimes;

  export default {
    getTimes,
    getPosition,
    getMoonPosition,
    getMoonIllumination,
    getMoonTimes
  };
}
