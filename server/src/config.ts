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
    host: '10.0.0.59',
    port: 3001,
    clientUrl: 'http://10.0.0.59:3000',
    staticDir: '../static',
    docsDir: '../docs',
    uploadsDir: '../uploads',
    apiUrl: 'http://10.0.0.59:3001'
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

const env = process.env.NODE_ENV || 'development';

export default config[env as keyof typeof config];
export { Config };