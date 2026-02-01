/**
 * Placeholder Avatar Generation Script
 * Generates placeholder avatars for missing images
 *
 * Usage: node scripts/generate-placeholder.js
 */

import OpenAI from 'openai';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load config
const configPath = join(__dirname, '..', 'config.yaml');
const config = yaml.load(readFileSync(configPath, 'utf8'));

if (!config.openai_api_key) {
  console.error('Error: openai_api_key not set in config.yaml');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: config.openai_api_key });

const AVATARS_DIR = join(__dirname, '..', 'frontend', 'public', 'avatars');

// Download image from URL
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        writeFileSync(filepath, buffer);
        resolve();
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function generatePlaceholder(type, outputPath) {
  const isFemale = type === 'female';
  const prompt = isFemale
    ? 'A question mark silhouette, feminine tactical cartoon style, wearing shooting ear protection headset with pink accents, simple flat design, circular frame, dark background, no text, placeholder avatar indicating "image not found"'
    : 'A question mark silhouette, tactical cartoon style, wearing shooting ear protection headset, simple flat design, circular frame, dark background, no text, placeholder avatar indicating "image not found"';

  console.log(`Generating ${type} placeholder...`);

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0].url;
    await downloadImage(imageUrl, outputPath);
    console.log(`Saved ${type} placeholder to ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Failed to generate ${type} placeholder:`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('QDog Placeholder Avatar Generator');
  console.log('='.repeat(60));
  console.log('');

  // Ensure directories exist
  const femaleDir = join(AVATARS_DIR, 'female');
  if (!existsSync(femaleDir)) {
    mkdirSync(femaleDir, { recursive: true });
  }

  // Generate male placeholder
  const malePath = join(AVATARS_DIR, 'placeholder.png');
  if (!existsSync(malePath)) {
    await generatePlaceholder('male', malePath);
  } else {
    console.log('Male placeholder already exists, skipping');
  }

  // Generate female placeholder
  const femalePath = join(femaleDir, 'placeholder.png');
  if (!existsSync(femalePath)) {
    await generatePlaceholder('female', femalePath);
  } else {
    console.log('Female placeholder already exists, skipping');
  }

  console.log('');
  console.log('Done!');
}

main().catch(console.error);
