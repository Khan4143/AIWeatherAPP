import axios from 'axios';
import { WeatherData } from './weatherService';

const OPENAI_API_ENDPOINT = 'https://us-central1-ai-weather-app-f69fc.cloudfunctions.net/getChatResponse';

// Development mode flag - set to true during development
const IS_DEVELOPMENT = true;

export interface OpenAIResponse {
  text: string;
  isWeatherRelated: boolean;
}

// Mock responses for development
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
  
  // Default response for other weather-related queries
  return `Currently in ${weatherInfo.location}, it's ${weatherInfo.temperature}°C with ${weatherInfo.description}. The humidity is ${weatherInfo.humidity}% and wind speed is ${weatherInfo.windSpeed} km/h.`;
};

/**
 * Generate a response using the OpenAI API through Firebase Cloud Function
 * @param userPrompt - The user's question or prompt
 * @param weatherInfo - Current weather data to enhance responses
 * @returns - Response text and whether it's weather related
 */
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

    // Use mock responses in development mode
    if (IS_DEVELOPMENT) {
      const isWeatherRelated = weatherKeywords.some(keyword => 
        userPrompt.toLowerCase().includes(keyword)
      );
      
      return {
        text: getMockResponse(userPrompt, weatherInfo),
        isWeatherRelated
      };
    }

    // Prepare the context for OpenAI API
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

    // Construct the prompt for OpenAI
    const prompt = `You are a weather assistant named Skylar. Use the following weather data to answer the user's question in a helpful and conversational way.
    Current weather data: ${JSON.stringify(weatherContext)}
    User's question: ${userPrompt}
    
    Important instructions:
    1. If the question is weather-related, answer directly using the weather data without any disclaimers about being a weather assistant.
    2. Only mention being a weather assistant if the question is NOT weather-related.
    3. Keep responses natural and conversational.
    4. Be specific and use the actual weather data values in your response.`;

    // Call OpenAI API through Firebase Cloud Function
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
    console.error('Error generating OpenAI response:', error);
    return {
      text: 'Sorry, I encountered an error while processing your request. Please try again later.',
      isWeatherRelated: false
    };
  }
};

// Weather keywords for checking if a query is weather-related
const weatherKeywords = [
  'weather', 'rain', 'temperature', 'hot', 'cold', 'sunny', 'cloudy',
  'forecast', 'humidity', 'storm', 'wind', 'precipitation', 'climate',
  'snow', 'umbrella', 'celsius', 'fahrenheit', 'degrees', 'sunrise', 'sunset',
  'outside', 'jacket', 'wear', 'clothing', 'outdoor', 'activity', 'commute',
  'travel', 'walk', 'bike', 'drive', 'transport', 'visibility', 'air quality'
];

/**
 * Check if a user's question is weather-related
 * @param query - The user's question
 * @returns - Boolean indicating if the question is weather-related
 */
export const isWeatherQuestion = async (query: string): Promise<boolean> => {
  // In development mode, just use keyword matching
  if (IS_DEVELOPMENT) {
    const lowerQuery = query.toLowerCase();
    return weatherKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  try {
    // Use keyword-based approach to determine if question is weather-related
    const lowerQuery = query.toLowerCase();
    
    // If any weather keyword is found, return true
    for (const keyword of weatherKeywords) {
      if (lowerQuery.includes(keyword)) {
        console.log(`Weather-related query detected: keyword "${keyword}" found in "${query}"`);
        return true;
      }
    }
    
    // For edge cases, call the OpenAI API for classification
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
      console.log('Weather classification result:', result);
      
      return !result.includes('NO');
    } catch (error) {
      console.error('API call error during weather classification:', error);
      return true; // Default to allowing the query if API fails
    }
    
  } catch (error) {
    console.error('Error validating weather question:', error);
    return true; // Default to true on error to prevent blocking legitimate queries
  }
}; 