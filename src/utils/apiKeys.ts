// API Keys utility file
// Provides a more secure way of accessing API keys than direct hardcoding

// IMPORTANT: Replace this with your own Google Gemini API key
// 1. Get an API key from https://ai.google.dev/
// 2. Make sure to enable the Gemini API in your Google Cloud project
// 3. Check that billing is set up for your Google Cloud project
// 4. Paste your key below between the quotes

// Store API keys in a single object
const apiKeys = {
  gemini: 'AIzaSyC7oZ4DJRG3KozdPuui4yBDuLu5fBjbatw', // Updated Gemini API key
  // Add more API keys as needed
};

/**
 * Get the API key for a specific service
 * @param keyName The name of the API key to retrieve
 * @returns The API key string or undefined if not found
 */
export const getApiKey = (keyName: keyof typeof apiKeys): string => {
  // Check if using placeholder key
  if (keyName === 'gemini' && (!apiKeys[keyName] || apiKeys[keyName].includes('YOUR_API_KEY'))) {
    console.error('Please replace the placeholder API key with your own Gemini API key');
  }
  
  return apiKeys[keyName] || '';
};

/**
 * Check if an API key exists
 * @param keyName The name of the API key to check
 * @returns Boolean indicating if the key exists and is not empty
 */
export const hasApiKey = (keyName: keyof typeof apiKeys): boolean => {
  const hasKey = !!apiKeys[keyName] && apiKeys[keyName].length > 0;
  if (keyName === 'gemini' && (!hasKey || apiKeys[keyName].includes('YOUR_API_KEY'))) {
    console.error('Missing or invalid Gemini API key. Please add your key in src/utils/apiKeys.ts');
    return false;
  }
  return hasKey;
}; 