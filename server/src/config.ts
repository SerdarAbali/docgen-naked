import dotenv from 'dotenv';
dotenv.config();

interface Config {
  host: string;
  port: number;
  clientUrl: string;
  staticDir: string;
  docsDir: string;
  uploadsDir: string;
  apiUrl: string;
}

const config = {
  development: {
    host: '0.0.0.0', // Listen on all interfaces
    port: 3001,
    clientUrl: 'https://app.documentit.io',
    staticDir: '../static',
    docsDir: '../docs',
    uploadsDir: '../uploads',
    apiUrl: 'https://api.documentit.io'
  },
  production: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '3001'),
    clientUrl: 'https://app.documentit.io',
    staticDir: process.env.STATIC_DIR || '../static',
    docsDir: process.env.DOCS_DIR || '../docs',
    uploadsDir: process.env.UPLOADS_DIR || '../uploads',
    apiUrl: 'https://api.documentit.io'
  }
};

// Default to production mode
const env = process.env.NODE_ENV || 'production';

export default config[env as keyof typeof config];
export { Config };