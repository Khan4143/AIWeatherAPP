const apiKeys = {
  gemini: 'AIzaSyC7oZ4DJRG3KozdPuui4yBDuLu5fBjbatw',
};

export const getApiKey = (keyName: keyof typeof apiKeys): string => {
  if (keyName === 'gemini' && (!apiKeys[keyName] || apiKeys[keyName].includes('YOUR_API_KEY'))) {
  }
  
  return apiKeys[keyName] || '';
};

export const hasApiKey = (keyName: keyof typeof apiKeys): boolean => {
  const hasKey = !!apiKeys[keyName] && apiKeys[keyName].length > 0;
  if (keyName === 'gemini' && (!hasKey || apiKeys[keyName].includes('YOUR_API_KEY'))) {
    return false;
  }
  return hasKey;
}; 