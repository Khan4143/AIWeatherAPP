import axios from 'axios';
import { WeatherData } from './weatherService';

// ⚠️ DEVELOPMENT MODE ACTIVE - NO REAL API CALLS ⚠️
// To enable real OpenAI API: set IS_DEVELOPMENT = false below
// The safeCallOpenAI function will handle rate limiting and prevent 429 errors
const OPENAI_API_ENDPOINT = 'https://us-central1-ai-weather-app-f69fc.cloudfunctions.net/getChatResponse';

// 🔧 Fix: Ensure development mode uses mock responses only.
// 🔧 Add better logging when real API is hit to track unexpected usage.
// 🔧 Temporarily disable retries to avoid overloading OpenAI.

const IS_DEVELOPMENT = false; // ✅ Force mock mode for now - Change to false to enable real API
const MAX_RETRIES = 0; // 🚫 Disable retries to prevent API flooding
const RATE_LIMIT_DELAY = 15000; // ⏳ Increase delay between requests
const BASE_RETRY_DELAY = 5000; // 5 seconds base delay

// 🔧 Easy toggle function for development/production
export const toggleDevelopmentMode = (enable: boolean) => {
  console.log(`🔄 ${enable ? 'Enabling' : 'Disabling'} development mode...`);
  // Note: This would need to be implemented with a state management solution
  // For now, manually change IS_DEVELOPMENT above
};

// 💬 Cursor Prompt - Use this to rate-limit OpenAI requests and debug 429 errors
console.log('🧪 Preparing to send OpenAI request...');

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

let lastCallTimestamp = 0;

async function safeCallOpenAI(message: string, weatherContext?: any) {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTimestamp;

  if (timeSinceLastCall < 1000) {
    const waitTime = 1000 - timeSinceLastCall;
    console.log(`⏳ Waiting ${waitTime}ms to prevent 429 error...`);
    await delay(waitTime);
  }

  lastCallTimestamp = Date.now();
  console.log('🚀 Sending OpenAI request now');

  try {
    const res = await fetch(OPENAI_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message,
        model: "gpt-3.5-turbo"
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    console.log('✅ OpenAI response received');
    return data;
  } catch (error) {
    console.error('❌ OpenAI API call failed:', error);
    throw error;
  }
}

// Request queue to prevent concurrent requests
let isRequestInProgress = false;
let requestQueue: Array<() => Promise<any>> = [];



// Helper function for exponential backoff
const exponentialBackoff = (attempt: number): number => {
  return Math.min(Math.pow(2, attempt) * BASE_RETRY_DELAY, 15000); // Max 15 seconds
};

// Process request queue
const processQueue = async (): Promise<void> => {
  if (isRequestInProgress || requestQueue.length === 0) {
    return;
  }

  isRequestInProgress = true;
  
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      try {
        await request();
        // Add delay between requests to respect rate limits
        await delay(RATE_LIMIT_DELAY);
      } catch (error) {
        console.error('Request in queue failed:', error);
      }
    }
  }
  
  isRequestInProgress = false;
};

// Add request to queue
const queueRequest = <T>(requestFn: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    processQueue();
  });
};

// Retry function with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimitError = error.response?.status === 429;
      const isLastAttempt = attempt === maxRetries;
      
      if (isRateLimitError && !isLastAttempt) {
        const backoffDelay = exponentialBackoff(attempt);
        console.log(`Rate limit hit, retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await delay(backoffDelay);
        continue;
      }
      
      if (isLastAttempt) {
        console.error(`Request failed after ${maxRetries + 1} attempts:`, error);
        throw error;
      }
      
      // For non-rate-limit errors, throw immediately
      throw error;
    }
  }
  
  throw new Error('Unexpected error in retry logic');
};

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
  // ✅ Add logging in generateResponse()
  console.log('🧠 generateResponse called with prompt:', userPrompt.substring(0, 50) + '...');
  console.log('🌦 Weather info:', weatherInfo ? `${weatherInfo.location}, ${weatherInfo.temperature}°C` : 'None');
  if (!IS_DEVELOPMENT) {
    console.log('🚀 Using OpenAI API...');
  } else {
    console.log('🧪 Development mode — using mock response.');
  }
  
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

    // Call OpenAI API through Firebase Cloud Function with safe rate limiting
    const response = await safeCallOpenAI(prompt, weatherContext);

    return {
      text: response.data.response,
      isWeatherRelated: true
    };

  } catch (error: any) {
    console.error('Error generating OpenAI response:', error);
    
    // Handle specific error types
    if (error.response?.status === 429) {
      return {
        text: 'I\'m receiving too many requests right now. Please wait a moment and try again.',
        isWeatherRelated: false
      };
    }
    
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        text: 'The request timed out. Please check your connection and try again.',
        isWeatherRelated: false
      };
    }
    
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
  console.log('🔍 isWeatherQuestion called with query:', query.substring(0, 30) + '...');
  
  // In development mode, just use keyword matching
  if (IS_DEVELOPMENT) {
    console.log('🧪 Development mode — using keyword matching.');
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
    
    // For edge cases, call the OpenAI API for classification with safe rate limiting
    try {
      const response = await safeCallOpenAI(`Is the query "${query}" related to weather, climate, or outdoor activities? Answer Yes or No.`);
      
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