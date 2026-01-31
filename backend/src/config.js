import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Look for config.yaml in multiple locations
const configPaths = [
  join(__dirname, '..', '..', 'config.yaml'),  // Development: backend/../config.yaml
  join(__dirname, '..', 'config.yaml'),         // Production: /app/config.yaml
  '/app/config.yaml'                            // Docker mount point
];

let config = {};

for (const configPath of configPaths) {
  if (existsSync(configPath)) {
    try {
      const fileContents = readFileSync(configPath, 'utf8');
      config = yaml.load(fileContents) || {};
      console.log(`Loaded config from: ${configPath}`);
      break;
    } catch (err) {
      console.warn(`Failed to load config from ${configPath}:`, err.message);
    }
  }
}

// Export config with env variable fallbacks
export default {
  resendApiKey: config.resend_api_key || process.env.RESEND_API_KEY || '',
  rangeName: config.range_name || 'QDog Range',
  defaultSessionMins: config.default_session_mins || 60,
  notifyTimeoutMins: config.notify_timeout_mins || 5,
  port: config.port || process.env.PORT || 3000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development'
};
