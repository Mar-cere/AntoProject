export const API_URL = 'https://antobackend.onrender.com';

export const fetchWithToken = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('userToken');
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}; 