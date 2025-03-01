const config = {
  development: {
    apiUrl: 'http://10.0.0.59:3001',
    baseUrl: 'http://10.0.0.59:3000'
  },
  production: {
    apiUrl: import.meta.env.VITE_API_URL || 'https://api.documentit.io',
    baseUrl: import.meta.env.VITE_BASE_URL || 'https://app.documentit.io'
  }
};
export default config[import.meta.env.NODE_ENV || 'development'];