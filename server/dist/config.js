"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
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
exports.default = config[env];
