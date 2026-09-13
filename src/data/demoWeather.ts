import type {ForecastData, ForecastDay, WeatherData} from '../services/weatherService';

export const DEMO_CITIES = [
  'Islamabad, PK',
  'Karachi, PK',
  'Lahore, PK',
  'London, GB',
  'New York, US',
  'Paris, FR',
  'Sydney, AU',
  'Tokyo, JP',
  'Dubai, AE',
  'Singapore, SG',
];

const cityCoordinates: Record<string, {lat: number; lon: number}> = {
  Islamabad: {lat: 33.6844, lon: 73.0479},
  Karachi: {lat: 24.8607, lon: 67.0011},
  Lahore: {lat: 31.5204, lon: 74.3587},
  London: {lat: 51.5072, lon: -0.1276},
  'New York': {lat: 40.7128, lon: -74.006},
  Paris: {lat: 48.8566, lon: 2.3522},
  Sydney: {lat: -33.8688, lon: 151.2093},
  Tokyo: {lat: 35.6762, lon: 139.6503},
  Dubai: {lat: 25.2048, lon: 55.2708},
  Singapore: {lat: 1.3521, lon: 103.8198},
};

const countryByCity: Record<string, string> = {
  Islamabad: 'PK', Karachi: 'PK', Lahore: 'PK', London: 'GB',
  'New York': 'US', Paris: 'FR', Sydney: 'AU', Tokyo: 'JP',
  Dubai: 'AE', Singapore: 'SG',
};

const toDisplayTemperature = (celsius: number, units: string) =>
  units === 'imperial' ? Math.round((celsius * 9) / 5 + 32) : celsius;

const normalizeCity = (city?: string) => {
  const requested = city?.split(',')[0].trim() || 'Islamabad';
  const known = Object.keys(cityCoordinates).find(
    item => item.toLowerCase() === requested.toLowerCase(),
  );
  return known || requested;
};

export const searchDemoCities = (query: string) => {
  const needle = query.trim().toLowerCase();
  return DEMO_CITIES.filter(city => city.toLowerCase().includes(needle));
};

export const createDemoWeather = (
  city = 'Islamabad, PK',
  units: 'metric' | 'imperial' | 'standard' = 'metric',
): WeatherData => {
  const location = normalizeCity(city);
  const coordinates = cityCoordinates[location] || cityCoordinates.Islamabad;
  const now = new Date();
  const sunrise = new Date(now);
  sunrise.setHours(6, 18, 0, 0);
  const sunset = new Date(now);
  sunset.setHours(18, 42, 0, 0);

  return {
    location,
    country: countryByCity[location] || city.split(',')[1]?.trim() || 'PK',
    temperature: toDisplayTemperature(24, units),
    tempMin: toDisplayTemperature(18, units),
    tempMax: toDisplayTemperature(28, units),
    feelsLike: toDisplayTemperature(25, units),
    humidity: 58,
    description: 'Partly cloudy',
    icon: '02d',
    windSpeed: units === 'imperial' ? 7 : 3.2,
    windDirection: 145,
    sunrise: Math.floor(sunrise.getTime() / 1000),
    sunset: Math.floor(sunset.getTime() / 1000),
    timezone: 18000,
    pressure: 1014,
    visibility: 10000,
    coordinates,
    uvi: 4.1,
    rainProbability: 0.18,
    clouds: 38,
  };
};

const makeForecastDay = (
  date: number,
  baseTemp: number,
  index: number,
  units: 'metric' | 'imperial' | 'standard',
  hourly = false,
): ForecastDay => {
  const icons = ['02d', '01d', '03d', '10d', '02d', '01d', '04d'];
  const descriptions = ['partly cloudy', 'clear sky', 'scattered clouds', 'light rain'];
  const temperature = toDisplayTemperature(baseTemp, units);
  return {
    date,
    sunrise: date,
    sunset: date + 43200,
    temperature: {
      day: temperature,
      min: toDisplayTemperature(baseTemp - 4, units),
      max: toDisplayTemperature(baseTemp + 3, units),
      night: toDisplayTemperature(baseTemp - 3, units),
      eve: toDisplayTemperature(baseTemp - 1, units),
      morn: toDisplayTemperature(baseTemp - 2, units),
    },
    feelsLike: {
      day: temperature,
      night: toDisplayTemperature(baseTemp - 3, units),
      eve: toDisplayTemperature(baseTemp - 1, units),
      morn: toDisplayTemperature(baseTemp - 2, units),
    },
    pressure: 1014 - index,
    humidity: 55 + index * 2,
    weather: {
      id: index === 3 ? 500 : 802,
      main: index === 3 ? 'Rain' : index === 1 ? 'Clear' : 'Clouds',
      description: descriptions[index % descriptions.length],
      icon: hourly && index > 7 ? icons[index % icons.length].replace('d', 'n') : icons[index % icons.length],
    },
    windSpeed: units === 'imperial' ? 7 + index : 3.2 + index * 0.2,
    windDirection: 140 + index * 8,
    clouds: 25 + index * 6,
    pop: index === 3 ? 0.55 : 0.08 + index * 0.03,
    rain: index === 3 ? 1.4 : undefined,
    uvi: hourly ? Math.max(0, 5 - Math.abs(index - 5)) : 3.5 + index * 0.25,
  };
};

export const createDemoForecast = (
  city = 'Islamabad, PK',
  units: 'metric' | 'imperial' | 'standard' = 'metric',
): ForecastData => {
  const current = createDemoWeather(city, units);
  const now = Math.floor(Date.now() / 1000);
  const startOfToday = new Date();
  startOfToday.setHours(12, 0, 0, 0);
  const dayStart = Math.floor(startOfToday.getTime() / 1000);

  return {
    location: current.location,
    country: current.country,
    timezone: current.timezone,
    current,
    daily: Array.from({length: 7}, (_, index) =>
      makeForecastDay(dayStart + index * 86400, 24 + (index % 3), index, units),
    ),
    hourly: Array.from({length: 24}, (_, index) =>
      makeForecastDay(now + index * 3600, 22 + Math.sin(index / 4) * 4, index, units, true),
    ),
  };
};

