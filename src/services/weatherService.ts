// OpenWeather API Service
// This file contains functions for fetching weather data from the OpenWeather API

const API_KEY = '027ed4b6eb25a572ae0e91302e6d93a2';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Update WeatherData interface to include UV index and rain probability
export interface WeatherData {
  location: string;
  country: string;
  temperature: number;
  tempMin: number;
  tempMax: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  windDirection: number;
  sunrise: number;
  sunset: number;
  timezone: number;
  pressure: number;
  visibility: number;
  coordinates: {
    lat: number;
    lon: number;
  };
  uvi: number;
  rainProbability: number;
  clouds: number;
  rain1h?: number;
}

export interface ForecastDay {
  date: number;
  sunrise: number;
  sunset: number;
  temperature: {
    day: number;
    min: number;
    max: number;
    night: number;
    eve: number;
    morn: number;
  };
  feelsLike: {
    day: number;
    night: number;
    eve: number;
    morn: number;
  };
  pressure: number;
  humidity: number;
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  };
  windSpeed: number;
  windDirection: number;
  clouds: number;
  pop: number; // Probability of precipitation
  rain?: number;
  uvi: number; // UV index
}

interface HourlyForecastData {
  dt: number;
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    feels_like: number;
    pressure: number;
    humidity: number;
  };
  weather: [{
    id: number;
    main: string;
    description: string;
    icon: string;
  }];
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  pop?: number;
  rain?: {
    '3h': number;
  };
  visibility: number;
}

export interface ForecastData {
  location: string;
  country: string;
  timezone: number;
  current: WeatherData;
  daily: ForecastDay[];
  hourly: ForecastDay[];
}

/**
 * Validates if a city exists in the OpenWeather API
 * @param city - City name with optional country code e.g. "London, GB"
 * @returns Promise with boolean indicating if the city is valid
 */
export const validateCity = async (city: string): Promise<boolean> => {
  try {
    // Split city name from country code - expected format: "City, CountryCode"
    const [cityName, countryCode] = city.split(',').map(part => part.trim());
    
    // Build the query string - if country code exists, add it to the query
    let query = cityName;
    if (countryCode) {
      query = `${cityName},${countryCode}`;
    }

    // Use the weather endpoint to check if the city exists
    const response = await fetch(
      `${BASE_URL}/weather?q=${query}&appid=${API_KEY}`
    );

    // If we get a 200 response, the city exists in the API
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Add new interface for weather icon mapping
interface WeatherIconMapping {
  materialIcon: string;  // MaterialCommunityIcons name
  featherIcon: string;  // Feather icons name
  description: string;  // Human readable description
}

// Centralized weather icon mapping
const WEATHER_ICONS: { [key: string]: WeatherIconMapping } = {
  '01d': { materialIcon: 'weather-sunny', featherIcon: 'sun', description: 'Clear sky (day)' },
  '01n': { materialIcon: 'weather-night', featherIcon: 'moon', description: 'Clear sky (night)' },
  '02d': { materialIcon: 'weather-partly-cloudy', featherIcon: 'cloud-sun', description: 'Few clouds (day)' },
  '02n': { materialIcon: 'weather-night-partly-cloudy', featherIcon: 'cloud-moon', description: 'Few clouds (night)' },
  '03d': { materialIcon: 'weather-cloudy', featherIcon: 'cloud', description: 'Scattered clouds (day)' },
  '03n': { materialIcon: 'weather-cloudy', featherIcon: 'cloud', description: 'Scattered clouds (night)' },
  '04d': { materialIcon: 'weather-cloudy', featherIcon: 'cloud', description: 'Broken clouds (day)' },
  '04n': { materialIcon: 'weather-cloudy', featherIcon: 'cloud', description: 'Broken clouds (night)' },
  '09d': { materialIcon: 'weather-partly-rainy', featherIcon: 'cloud-rain', description: 'Shower rain (day)' },
  '09n': { materialIcon: 'weather-partly-rainy', featherIcon: 'cloud-rain', description: 'Shower rain (night)' },
  '10d': { materialIcon: 'weather-rainy', featherIcon: 'cloud-drizzle', description: 'Rain (day)' },
  '10n': { materialIcon: 'weather-rainy', featherIcon: 'cloud-drizzle', description: 'Rain (night)' },
  '11d': { materialIcon: 'weather-lightning-rainy', featherIcon: 'cloud-lightning', description: 'Thunderstorm (day)' },
  '11n': { materialIcon: 'weather-lightning-rainy', featherIcon: 'cloud-lightning', description: 'Thunderstorm (night)' },
  '13d': { materialIcon: 'weather-snowy', featherIcon: 'cloud-snow', description: 'Snow (day)' },
  '13n': { materialIcon: 'weather-snowy', featherIcon: 'cloud-snow', description: 'Snow (night)' },
  '50d': { materialIcon: 'weather-fog', featherIcon: 'wind', description: 'Mist (day)' },
  '50n': { materialIcon: 'weather-fog', featherIcon: 'wind', description: 'Mist (night)' },
};

// Helper function to determine weather icon based on conditions
function determineWeatherIcon(
  weatherMain: string,
  clouds: number,
  rain1h?: number,
  visibility?: number,
  isNight: boolean = false
): string {
  // Define thresholds
  const SIGNIFICANT_RAIN = 0.5; // mm/h - only consider it "rain" if more than this
  const CLEAR_CLOUD_THRESHOLD = 20;
  const FEW_CLOUDS_THRESHOLD = 35;
  const SCATTERED_CLOUDS_THRESHOLD = 65;
  const GOOD_VISIBILITY = 8000;

  // Determine base condition
  let iconCode: string;

  // First, check if there's significant rain
  if (rain1h !== undefined && rain1h >= SIGNIFICANT_RAIN) {
    iconCode = rain1h > 2.5 ? '09' : '10'; // Heavy vs light rain
  }
  // If there's no significant rain, use cloud coverage regardless of what the API says is "main"
  else {
    if (clouds <= CLEAR_CLOUD_THRESHOLD && visibility && visibility >= GOOD_VISIBILITY) {
      iconCode = '01'; // Clear sky
    }
    else if (clouds <= FEW_CLOUDS_THRESHOLD) {
      iconCode = '02'; // Few clouds
    }
    else if (clouds <= SCATTERED_CLOUDS_THRESHOLD) {
      iconCode = '03'; // Scattered clouds
    }
    else {
      iconCode = '04'; // Broken clouds
    }
  }

  // Add day/night suffix
  iconCode += isNight ? 'n' : 'd';

  return iconCode;
}

// Helper function to verify weather condition matches the description and icon
function verifyWeatherCondition(
  weatherData: { main: string; description: string; icon: string },
  clouds: number,
  rain1h?: number,
  visibility?: number
): { main: string; description: string; icon: string } {
  // Determine if it's night based on original icon
  const isNight = weatherData.icon.endsWith('n');

  // Get the correct icon based on actual conditions
  const correctIconCode = determineWeatherIcon(
    weatherData.main,
    clouds,
    rain1h,
    visibility,
    isNight
  );

  // Get the mapping for the correct icon
  const iconMapping = WEATHER_ICONS[correctIconCode];

  // Determine the main condition based on actual measurements
  let mainCondition = weatherData.main;
  let description = weatherData.description;

  // If API says it's raining but there's no significant rain, correct it
  if (weatherData.main === 'Rain' && (!rain1h || rain1h < 0.5)) {
    if (clouds <= 20) {
      mainCondition = 'Clear';
      description = 'clear sky';
    } else if (clouds <= 35) {
      mainCondition = 'Clouds';
      description = 'few clouds';
    } else if (clouds <= 65) {
      mainCondition = 'Clouds';
      description = 'scattered clouds';
    } else {
      mainCondition = 'Clouds';
      description = 'broken clouds';
    }
  }

  // Create verified weather data
  const verifiedData = {
    main: mainCondition,
    description: description,
    icon: correctIconCode
  };

  return verifiedData;
}

// Export helper function to get Material icon name
export function getMaterialWeatherIcon(iconCode: string): string {
  return WEATHER_ICONS[iconCode]?.materialIcon || 'weather-cloudy';
}

// Export helper function to get Feather icon name
export function getFeatherWeatherIcon(iconCode: string): string {
  return WEATHER_ICONS[iconCode]?.featherIcon || 'cloud';
}

/**
 * Fetch current weather data for a specific city
 * @param city - City name with country code e.g. "London, GB"
 * @param units - Units of measurement: 'metric' (Celsius), 'imperial' (Fahrenheit), or 'standard' (Kelvin)
 * @returns Promise with weather data
 */
export const fetchCurrentWeather = async (
  city: string,
  units: 'metric' | 'imperial' | 'standard' = 'metric'
): Promise<WeatherData> => {
  try {
    // Split city name from country code - expected format: "City, CountryCode"
    const [cityName, countryCode] = city.split(',').map(part => part.trim());
    
    // Build the query string - if country code exists, add it to the query
    let query = cityName;
    if (countryCode) {
      query = `${cityName},${countryCode}`;
    }

    const response = await fetch(
      `${BASE_URL}/weather?q=${query}&appid=${API_KEY}&units=${units}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch weather data');
    }

    const data = await response.json();

    // Fetch detailed weather data including UV index
    const detailedData = await fetchDetailedWeather(data.coord.lat, data.coord.lon);
    
    // Verify weather condition with all available data
    const verifiedWeather = verifyWeatherCondition(
      data.weather[0],
      data.clouds?.all || 0,
      data.rain?.['1h'],
      data.visibility
    );
    
    // Map the API response to our WeatherData interface
    const weatherData: WeatherData = {
      location: data.name,
      country: data.sys.country,
      temperature: data.main.temp,
      tempMin: data.main.temp_min,
      tempMax: data.main.temp_max,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      description: verifiedWeather.description,
      icon: verifiedWeather.icon,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      timezone: data.timezone,
      pressure: data.main.pressure,
      visibility: data.visibility,
      coordinates: {
        lat: data.coord.lat,
        lon: data.coord.lon,
      },
      uvi: detailedData?.current?.uvi || 0,
      rainProbability: (() => {
        const pop = detailedData?.hourly?.[0]?.pop || 0;
        const weatherMain = detailedData?.hourly?.[0]?.weather?.[0]?.main;
        
        const validatedPop = validateRainProbability(pop, weatherMain);
        
        return validatedPop;
      })(),
      clouds: data.clouds?.all || 0,
      rain1h: data.rain?.['1h'],
    };

    return weatherData;
  } catch (error: any) {
    throw new Error(`Failed to fetch weather: ${error.message}`);
  }
};

/**
 * Fetch weather forecast for a specific city
 * @param city - City name with country code e.g. "London, GB"
 * @param units - Units of measurement: 'metric' (Celsius), 'imperial' (Fahrenheit), or 'standard' (Kelvin)
 * @returns Promise with forecast data
 */
export const fetchWeatherForecast = async (
  city: string,
  units: 'metric' | 'imperial' | 'standard' = 'metric'
): Promise<ForecastData> => {
  try {
    // First get the current weather
    const currentWeather = await fetchCurrentWeather(city, units);
    
    // Split city name from country code - expected format: "City, CountryCode"
    const [cityName, countryCode] = city.split(',').map(part => part.trim());
    
    // Build the query string - if country code exists, add it to the query
    let query = cityName;
    if (countryCode) {
      query = `${cityName},${countryCode}`;
    }

    // First get coordinates for the city
    const geoResponse = await fetch(
      `${BASE_URL}/weather?q=${query}&appid=${API_KEY}&units=${units}`
    );

    if (!geoResponse.ok) {
      const errorData = await geoResponse.json();
      throw new Error(errorData.message || 'Failed to fetch city coordinates');
    }

    const geoData = await geoResponse.json();
    const { lat, lon } = geoData.coord;

    // Get hourly forecast using One Call API (provides true hourly data)
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${API_KEY}&units=${units}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch forecast data');
    }

    const data = await response.json();

    // Process daily forecasts from One Call API
    const dailyForecasts = data.daily || [];
    
    // Get hourly forecasts from One Call API (provides true hourly data for 48 hours)
    const hourlyForecasts = data.hourly || [];
    
    // Map the API response to our ForecastData interface
    const forecastData: ForecastData = {
      location: currentWeather.location,
      country: currentWeather.country,
      timezone: data.timezone_offset || 0,
      current: currentWeather,
      daily: dailyForecasts.map((dayData: any) => ({
        date: dayData.dt,
        sunrise: dayData.sunrise,
        sunset: dayData.sunset,
        temperature: {
          day: dayData.temp.day,
          min: dayData.temp.min,
          max: dayData.temp.max,
          night: dayData.temp.night,
          eve: dayData.temp.eve,
          morn: dayData.temp.morn,
        },
        feelsLike: {
          day: dayData.feels_like.day,
          night: dayData.feels_like.night,
          eve: dayData.feels_like.eve,
          morn: dayData.feels_like.morn,
        },
        pressure: dayData.pressure,
        humidity: dayData.humidity,
        weather: {
          id: dayData.weather[0].id,
          main: dayData.weather[0].main,
          description: dayData.weather[0].description,
          icon: dayData.weather[0].icon,
        },
        windSpeed: dayData.wind_speed,
        windDirection: dayData.wind_deg,
        clouds: dayData.clouds,
        pop: dayData.pop || 0,
        rain: dayData.rain,
        uvi: dayData.uvi,
      })),
      hourly: hourlyForecasts.map((hourData: any) => {
        // Verify weather condition for each hour
        const verifiedWeather = verifyWeatherCondition(
          hourData.weather[0],
          hourData.clouds,
          hourData.rain,
          hourData.visibility
        );

        return {
          date: hourData.dt,
          sunrise: currentWeather.sunrise,
          sunset: currentWeather.sunset,
          temperature: {
            day: hourData.temp,
            min: hourData.temp,
            max: hourData.temp,
            night: hourData.temp,
            eve: hourData.temp,
            morn: hourData.temp,
          },
          feelsLike: {
            day: hourData.feels_like,
            night: hourData.feels_like,
            eve: hourData.feels_like,
            morn: hourData.feels_like,
          },
          pressure: hourData.pressure,
          humidity: hourData.humidity,
          weather: {
            id: hourData.weather[0].id,
            main: verifiedWeather.main,
            description: verifiedWeather.description,
            icon: verifiedWeather.icon,
          },
          windSpeed: hourData.wind_speed,
          windDirection: hourData.wind_deg,
          clouds: hourData.clouds,
          pop: hourData.pop || 0,
          rain: hourData.rain,
          uvi: hourData.uvi,
        };
      })
    };

    return forecastData;
  } catch (error: any) {
    throw new Error(`Failed to fetch forecast: ${error.message}`);
  }
};

/**
 * Process the 3-hour forecast data to get daily forecasts
 * @param forecastList - List of 3-hour forecasts
 * @returns Array of daily forecasts
 */
function processForecastData(forecastList: any[]): any[] {
  const dailyData: any[] = [];
  const dayMap = new Map<string, any[]>();
  
  // Group forecasts by day
  forecastList.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, []);
    }
    
    // Verify weather condition before adding to the day's data
    const verifiedWeather = verifyWeatherCondition(
      item.weather[0],
      item.clouds?.all || 0,
      item.rain?.['3h'] ? item.rain['3h'] / 3 : undefined, // Convert 3h rain to 1h
      item.visibility
    );
    
    // Update the item with verified weather data
    item.weather[0] = verifiedWeather;
    
    dayMap.get(dayKey)?.push(item);
  });
  
  // Process each day's data
  dayMap.forEach((items, day) => {
    // Sort by timestamp
    items.sort((a, b) => a.dt - b.dt);
    
    // Find forecast closest to noon for representative 'day' temp
    let closestToNoon = items[0];
    let minDiff = Number.MAX_SAFE_INTEGER;
    
    items.forEach(item => {
      const date = new Date(item.dt * 1000);
      const hour = date.getHours();
      const diff = Math.abs(hour - 12); // Find closest to noon (12PM)
      
      if (diff < minDiff) {
        minDiff = diff;
        closestToNoon = item;
      }
    });
    
    // Compute true min/max for the day
    let minTemp = items[0].main.temp_min;
    let maxTemp = items[0].main.temp_max;
    
    items.forEach(item => {
      if (item.main.temp_min < minTemp) minTemp = item.main.temp_min;
      if (item.main.temp_max > maxTemp) maxTemp = item.main.temp_max;
    });
    
    // Attach min/max to the representative forecast
    closestToNoon.main.temp_min = minTemp;
    closestToNoon.main.temp_max = maxTemp;
    
    dailyData.push(closestToNoon);
  });
  
  // Sort by timestamp
  return dailyData.sort((a, b) => a.dt - b.dt);
}

/**
 * Fetch weather data by geolocation coordinates
 * @param lat - Latitude
 * @param lon - Longitude
 * @param units - Units of measurement: 'metric' (Celsius), 'imperial' (Fahrenheit), or 'standard' (Kelvin)
 * @returns Promise with weather data
 */
export const fetchWeatherByCoordinates = async (
  lat: number,
  lon: number,
  units: 'metric' | 'imperial' | 'standard' = 'metric'
): Promise<WeatherData> => {
  try {
    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch weather data');
    }

    const data = await response.json();

    // Fetch detailed weather data including UV index
    const detailedData = await fetchDetailedWeather(data.coord.lat, data.coord.lon);
    
    // Verify weather condition with all available data
    const verifiedWeather = verifyWeatherCondition(
      data.weather[0],
      data.clouds?.all || 0,
      data.rain?.['1h'],
      data.visibility
    );
    
    // Map the API response to our WeatherData interface
    const weatherData: WeatherData = {
      location: data.name,
      country: data.sys.country,
      temperature: data.main.temp,
      tempMin: data.main.temp_min,
      tempMax: data.main.temp_max,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      description: verifiedWeather.description,
      icon: verifiedWeather.icon,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      timezone: data.timezone,
      pressure: data.main.pressure,
      visibility: data.visibility,
      coordinates: {
        lat: data.coord.lat,
        lon: data.coord.lon,
      },
      uvi: detailedData?.current?.uvi || 0,
      rainProbability: (() => {
        const pop = detailedData?.hourly?.[0]?.pop || 0;
        const weatherMain = detailedData?.hourly?.[0]?.weather?.[0]?.main;
        
        const validatedPop = validateRainProbability(pop, weatherMain);
        
        return validatedPop;
      })(),
      clouds: data.clouds?.all || 0,
      rain1h: data.rain?.['1h'],
    };

    return weatherData;
  } catch (error: any) {
    throw new Error(`Failed to fetch weather: ${error.message}`);
  }
};

// Add new function to fetch detailed weather data including UV index
async function fetchDetailedWeather(lat: number, lon: number): Promise<any> {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&appid=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch detailed weather data');
    }

    const data = await response.json();
    
    return data;
  } catch (error) {
    return null;
  }
}

// Export weather icon URL helper
export const getWeatherIconUrl = (iconCode: string): string => {
  // Log icon code before generating URL
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};

/**
 * Validate and cap rain probability to prevent unrealistic 100% values
 * @param pop - Raw probability of precipitation from API (0-1)
 * @param weatherMain - Current weather condition (optional, for cross-validation)
 * @returns Validated rain probability (0-0.95)
 */
export const validateRainProbability = (pop: number, weatherMain?: string): number => {
  // Cap rain probability at 95% to avoid unrealistic 100% values
  let validatedPop = Math.min(pop || 0, 0.95);
  
  // If hourly data shows very high rain probability, cross-reference with weather condition
  if (validatedPop > 0.8) {
    // If current weather doesn't indicate rain, reduce the probability
    if (weatherMain && !['Rain', 'Drizzle', 'Thunderstorm'].includes(weatherMain)) {
      validatedPop = Math.min(validatedPop, 0.7); // Cap at 70% if current weather doesn't show rain
    }
  }
  
  return validatedPop;
}; 