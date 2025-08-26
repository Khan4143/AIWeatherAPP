import axios from 'axios';
import { WeatherData } from './weatherService';

// Use the stable Firebase Functions HTTPS URL instead of a temporary ngrok tunnel
const OPENAI_API_ENDPOINT = 'https://us-central1-ai-weather-app-f69fc.cloudfunctions.net/getChatResponse';

const IS_DEVELOPMENT = false;

export interface OpenAIResponse {
  text: string;
  isWeatherRelated: boolean;
}

const getMockResponse = (userPrompt: string, weatherInfo: WeatherData): string => {
  const lowerPrompt = userPrompt.toLowerCase();
  
  if (lowerPrompt.includes('rain')) {
    return `Based on the current weather in ${weatherInfo.location}, with ${weatherInfo.description}, there's no rain expected. The sky is ${weatherInfo.description} with a temperature of ${weatherInfo.temperature}°C.`;
  }
  
  if (lowerPrompt.includes('temperature') || lowerPrompt.includes('hot') || lowerPrompt.includes('cold')) {
    return `The current temperature in ${weatherInfo.location} is ${weatherInfo.temperature}°C, and it feels like ${weatherInfo.feelsLike}°C. The weather is ${weatherInfo.description}.`;
  }
  
  if (lowerPrompt.includes('wind')) {
    return `The wind speed in ${weatherInfo.location} is currently ${weatherInfo.windSpeed} km/h, blowing from the ${weatherInfo.windDirection}.`;
  }
  
  if (lowerPrompt.includes('humidity')) {
    return `The current humidity level in ${weatherInfo.location} is ${weatherInfo.humidity}%.`;
  }
  
  if (lowerPrompt.includes('sunset') || lowerPrompt.includes('sunrise')) {
    const sunrise = new Date(weatherInfo.sunrise * 1000).toLocaleTimeString();
    const sunset = new Date(weatherInfo.sunset * 1000).toLocaleTimeString();
    return `Today in ${weatherInfo.location}, the sun rises at ${sunrise} and sets at ${sunset}.`;
  }
  
  return `Currently in ${weatherInfo.location}, it's ${weatherInfo.temperature}°C with ${weatherInfo.description}. The humidity is ${weatherInfo.humidity}% and wind speed is ${weatherInfo.windSpeed} km/h.`;
};


export const generateResponse = async (
  userPrompt: string,
  weatherInfo?: WeatherData
): Promise<OpenAIResponse> => {
  try {
    if (!weatherInfo) {
      return {
        isWeatherRelated: false,
        text: 'Weather data is not available. Please check your connection and try again.'
      };
    }

    if (IS_DEVELOPMENT) {
      const isWeatherRelated = weatherKeywords.some(keyword => 
        userPrompt.toLowerCase().includes(keyword)
      );
      
      return {
        text: getMockResponse(userPrompt, weatherInfo),
        isWeatherRelated
      };
    }

    const weatherContext = {
      location: weatherInfo.location,
      country: weatherInfo.country,
      temperature: weatherInfo.temperature,
      feelsLike: weatherInfo.feelsLike,
      humidity: weatherInfo.humidity,
      description: weatherInfo.description,
      windSpeed: weatherInfo.windSpeed,
      windDirection: weatherInfo.windDirection,
      visibility: weatherInfo.visibility,
      pressure: weatherInfo.pressure,
      sunrise: new Date(weatherInfo.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(weatherInfo.sunset * 1000).toLocaleTimeString()
    };

    const prompt = `You are a weather assistant named Skylar. Use the following weather data to answer the user's question in a helpful and conversational way.
    Current weather data: ${JSON.stringify(weatherContext)}
    User's question: ${userPrompt}
    
    Important instructions:
    1. If the question is weather-related, answer directly using the weather data without any disclaimers about being a weather assistant.
    2. Only mention being a weather assistant if the question is NOT weather-related.
    3. Keep responses natural and conversational.
    4. Be specific and use the actual weather data values in your response.`;


    const response = await axios.post(
      OPENAI_API_ENDPOINT,
      {
        message: prompt,
        model: "gpt-3.5-turbo"
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      text: response.data.response,
      isWeatherRelated: true
    };

  } catch (error) {
    return {
      text: 'Sorry, I encountered an error while processing your request. Please try again later.',
      isWeatherRelated: false
    };
  }
};


const weatherKeywords = [
  'weather', 'rain', 'temperature', 'hot', 'cold', 'sunny', 'cloudy',
  'forecast', 'humidity', 'storm', 'wind', 'precipitation', 'climate',
  'snow', 'umbrella', 'celsius', 'fahrenheit', 'degrees', 'sunrise', 'sunset',
  'outside', 'jacket', 'wear', 'clothing', 'outdoor', 'activity', 'commute',
  'travel', 'walk', 'bike', 'drive', 'transport', 'visibility', 'air quality'
];


export const isWeatherQuestion = async (query: string): Promise<boolean> => {
  if (IS_DEVELOPMENT) {
    const lowerQuery = query.toLowerCase();
    return weatherKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  try {
    const lowerQuery = query.toLowerCase();
    
    for (const keyword of weatherKeywords) {
      if (lowerQuery.includes(keyword)) {
        return true;
      }
    }
    try {
      const response = await axios.post(
        OPENAI_API_ENDPOINT,
        {
          message: `Is the query "${query}" related to weather, climate, or outdoor activities? Answer Yes or No.`,
          model: "gpt-3.5-turbo"
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const result = response.data.response.trim().toUpperCase();
      
      return !result.includes('NO');
    } catch (error) {
      return true;
    }
    
  } catch (error) {
    return true;
  }
}; 