interface Config {
  apiUrl: string;
  baseUrl: string;
}

interface ConfigMap {
  development: Config;
  production: Config;
  [key: string]: Config;
}

// Define environment variables for TypeScript
interface ImportMetaEnv {
  VITE_API_URL?: string;
  VITE_BASE_URL?: string;
  NODE_ENV?: string;
}

// Extend ImportMeta interface
interface ImportMeta {
  env: ImportMetaEnv;
}

const config: ConfigMap = {
  development: {
    apiUrl: 'https://api.documentit.io',
    baseUrl: 'https://app.documentit.io'
  },
  production: {
    apiUrl: import.meta.env.VITE_API_URL || 'https://api.documentit.io',
    baseUrl: import.meta.env.VITE_BASE_URL || 'https://app.documentit.io'
  }
};

// Force production mode by default
const nodeEnv = import.meta.env.NODE_ENV || 'production';
export default config[nodeEnv as keyof ConfigMap];