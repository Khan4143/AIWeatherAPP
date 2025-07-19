// Gemini AI API Service for handling chat interactions
// This service focuses on weather-related questions and responses

import { getApiKey } from '../utils/apiKeys';
import { WeatherData, ForecastData } from './weatherService';
import axios from 'axios';

// Try modern API endpoint first
const PRIMARY_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent';
// Fallback to legacy API endpoint if needed
const FALLBACK_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

const MAX_RETRIES = 2; // Maximum number of retry attempts for API calls

export interface GeminiResponse {
  text: string;
  isWeatherRelated: boolean;
}

interface WeatherInfo {
  currentWeather?: WeatherData | null;
  forecast?: ForecastData | null;
  location?: string;
  units?: 'metric' | 'imperial';
}

/**
 * Check if a user's question is weather-related
 * @param query - The user's question
 * @returns - Boolean indicating if the question is weather-related
 */
export const isWeatherQuestion = async (query: string): Promise<boolean> => {
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      const API_KEY = getApiKey('gemini');
      
      if (!API_KEY) {
        console.error('Gemini API key is missing');
        return true; // Default to true to prevent blocking legitimate queries
      }
      
      // Use simpler keyword-based approach rather than making another API call
      const weatherKeywords = [
        'weather', 'rain', 'temperature', 'hot', 'cold', 'sunny', 'cloudy', 
        'forecast', 'humidity', 'storm', 'wind', 'precipitation', 'climate',
        'snow', 'umbrella', 'celsius', 'fahrenheit', 'degrees', 'sunrise', 'sunset',
        'outside', 'jacket', 'wear', 'clothing', 'outdoor', 'activity'
      ];
      
      // Convert query to lowercase for case-insensitive matching
      const lowerQuery = query.toLowerCase();
      
      // If any weather keyword is found, return true
      for (const keyword of weatherKeywords) {
        if (lowerQuery.includes(keyword)) {
          console.log(`Weather-related query detected: keyword "${keyword}" found in "${query}"`);
          return true;
        }
      }
      
      // No keywords found, but let's make a lightweight API call as fallback
      console.log(`No weather keywords found in query, calling API for validation: "${query}"`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch(`${PRIMARY_API_URL}?key=${API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `Is the query "${query}" related to weather, climate, or outdoor activities? Answer Yes or No.` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,  // Low temperature for more deterministic responses
              maxOutputTokens: 5,
              topP: 1,
              topK: 1
            }
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          // If validation API call fails, default to true (accept all queries)
          console.error(`Validation API request failed with status: ${response.status}`);
          return true; // Accept the query if API fails
        }

        const data = await response.json();
        
        // Extract the validation result
        let result = '';
        if (data.candidates && 
            data.candidates[0] && 
            data.candidates[0].content && 
            data.candidates[0].content.parts && 
            data.candidates[0].content.parts[0] && 
            data.candidates[0].content.parts[0].text) {
          result = data.candidates[0].content.parts[0].text.trim().toUpperCase();
          console.log('Validation result:', result);
        }

        // If we get YES/NO response, use it, otherwise default to accepting the query
        return !result.includes('NO');
      } catch (error) {
        console.error('API call error during validation:', error);
        return true; // Default to allowing the query if API fails
      }
      
    } catch (error: any) {
      console.error('Error validating weather question:', error);
      return true; // Default to true on error to prevent blocking legitimate queries
    }
  }
  
  return true; // Default fallback after all retries
};

/**
 * Generate a response using the Gemini API
 * @param userPrompt - The user's question or prompt
 * @param weatherInfo - Current weather data to enhance responses
 * @returns - Response text and whether it's weather related
 */
export const generateResponse = async (
  userPrompt: string,
  weatherInfo?: WeatherData
): Promise<GeminiResponse> => {
  try {
    const API_KEY = getApiKey('gemini');
    if (!API_KEY) {
      throw new Error('Gemini API key is missing');
    }

    if (!weatherInfo) {
      return {
        isWeatherRelated: false,
        text: 'Weather data is not available. Please check your connection and try again.'
      };
    }

    // Prepare the context for Gemini API
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

    // Construct the prompt for Gemini
    const prompt = `You are a weather assistant named Skylar. Use the following weather data to answer the user's question in a helpful and conversational way. 
    Current weather data: ${JSON.stringify(weatherContext)}
    User's question: ${userPrompt}
    Please provide a natural, conversational response that directly addresses the user's question using the weather data provided. 
    If the question is not weather-related, politely inform them that you're a weather assistant and can help with weather-related questions.`;

    // Call Gemini API
    const response = await axios.post(
      PRIMARY_API_URL,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY
        }
      }
    );

    // Extract the response text from Gemini's response
    const responseText = response.data.candidates[0].content.parts[0].text;

    // Determine if the response is weather-related
    const weatherKeywords = [
      'weather', 'rain', 'temperature', 'hot', 'cold', 'sunny', 'cloudy',
      'forecast', 'humidity', 'storm', 'wind', 'precipitation', 'climate',
      'snow', 'umbrella', 'celsius', 'fahrenheit', 'degrees', 'sunrise', 'sunset',
      'outside', 'jacket', 'wear', 'clothing', 'outdoor', 'activity', 'commute',
      'travel', 'walk', 'bike', 'drive', 'transport', 'visibility', 'air quality'
    ];

    const isWeatherRelated = weatherKeywords.some(keyword => 
      userPrompt.toLowerCase().includes(keyword)
    );

    return {
      text: responseText,
      isWeatherRelated
    };

  } catch (error) {
    console.error('Error generating response:', error);
    
    // Try fallback API endpoint if primary fails
    try {
      const API_KEY = getApiKey('gemini');
      const response = await axios.post(
        FALLBACK_API_URL,
        {
          contents: [{
            parts: [{
              text: `You are a weather assistant named Skylar. The user asked: "${userPrompt}". 
              Please provide a helpful response about the weather.`
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': API_KEY
          }
        }
      );

      return {
        text: response.data.candidates[0].content.parts[0].text,
        isWeatherRelated: true
      };
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
      return {
        text: "I'm having trouble processing your request. Please try again in a moment.",
        isWeatherRelated: false
      };
    }
  }
}; 