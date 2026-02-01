/**
 * Avatar Generation Script
 * Generates 100 tactical cartoon animal avatars using DALL-E 3
 *
 * Usage: node scripts/generate-avatars.js
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

// 100 Animals organized by category
const ANIMALS = [
  // Predator Birds (15)
  'Hawk', 'Falcon', 'Eagle', 'Owl', 'Raven', 'Condor', 'Osprey', 'Kestrel',
  'Harrier', 'Vulture', 'Kite', 'Shrike', 'Goshawk', 'Merlin', 'Phoenix',

  // Canines (12)
  'Wolf', 'Fox', 'Coyote', 'Jackal', 'Dingo', 'Husky', 'Shepherd', 'Malinois',
  'Doberman', 'Rottweiler', 'Hound', 'Akita',

  // Felines (15)
  'Cougar', 'Lynx', 'Panther', 'Tiger', 'Lion', 'Jaguar', 'Leopard', 'Cheetah',
  'Bobcat', 'Ocelot', 'Caracal', 'Serval', 'Puma', 'Wildcat', 'Sabertooth',

  // Bears & Large Mammals (12)
  'Bear', 'Grizzly', 'Kodiak', 'Polar', 'Wolverine', 'Badger', 'Bison', 'Buffalo',
  'Moose', 'Elk', 'Stag', 'Ram',

  // Reptiles (10)
  'Viper', 'Cobra', 'Python', 'Mamba', 'Rattler', 'Gator', 'Croc', 'Komodo',
  'Gecko', 'Iguana',

  // Other Predators (12)
  'Shark', 'Barracuda', 'Orca', 'Mantis', 'Scorpion', 'Tarantula', 'Hornet',
  'Wasp', 'Mongoose', 'Weasel', 'Ferret', 'Marten',

  // Wild Cards (12)
  'Rhino', 'Hippo', 'Boar', 'Warthog', 'Hyena', 'Gorilla', 'Mandrill',
  'HoneyBadger', 'Tasmanian', 'Ratel', 'Armadillo', 'Pangolin',

  // Mythical (12)
  'Dragon', 'Griffin', 'Chimera', 'Cerberus', 'Hydra', 'Basilisk', 'Wyvern',
  'Manticore', 'Thunderbird', 'Fenrir', 'Kraken', 'Leviathan'
];

const STYLE_PROMPT = config.avatars?.style ||
  'tactical cartoon style, wearing shooting ear protection headset, cool confident expression, military tactical gear, simple flat design, circular frame, dark background, no text, video game character avatar';

const OUTPUT_DIR = join(__dirname, '..', 'frontend', 'public', 'avatars');

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Download image from URL
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = writeFileSync;

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
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

// Generate a single avatar
async function generateAvatar(animal, index) {
  const filename = `${animal.toLowerCase()}.png`;
  const filepath = join(OUTPUT_DIR, filename);

  // Skip if already exists
  if (existsSync(filepath)) {
    console.log(`[${index + 1}/100] Skipping ${animal} (already exists)`);
    return { animal, status: 'skipped' };
  }

  const prompt = `A ${animal}, ${STYLE_PROMPT}`;

  try {
    console.log(`[${index + 1}/100] Generating ${animal}...`);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0].url;
    await downloadImage(imageUrl, filepath);

    console.log(`[${index + 1}/100] Saved ${filename}`);
    return { animal, status: 'success' };

  } catch (error) {
    console.error(`[${index + 1}/100] Failed ${animal}: ${error.message}`);
    return { animal, status: 'error', error: error.message };
  }
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('QDog Avatar Generator');
  console.log(`Generating ${ANIMALS.length} tactical animal avatars`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('='.repeat(60));
  console.log('');

  const results = {
    success: [],
    skipped: [],
    errors: []
  };

  // Process sequentially to avoid rate limits
  for (let i = 0; i < ANIMALS.length; i++) {
    const result = await generateAvatar(ANIMALS[i], i);

    if (result.status === 'success') results.success.push(result.animal);
    else if (result.status === 'skipped') results.skipped.push(result.animal);
    else results.errors.push(result);

    // Small delay between requests to avoid rate limiting
    if (result.status === 'success') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Save manifest of all animals
  const manifest = {
    animals: ANIMALS.map(a => a.toLowerCase()),
    generated: new Date().toISOString(),
    total: ANIMALS.length
  };
  writeFileSync(join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Generation Complete!');
  console.log(`  Success: ${results.success.length}`);
  console.log(`  Skipped: ${results.skipped.length}`);
  console.log(`  Errors:  ${results.errors.length}`);
  console.log('='.repeat(60));

  if (results.errors.length > 0) {
    console.log('\nFailed avatars:');
    results.errors.forEach(e => console.log(`  - ${e.animal}: ${e.error}`));
  }
}

main().catch(console.error);
