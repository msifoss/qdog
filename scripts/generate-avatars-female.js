/**
 * Female Avatar Generation Script
 * Generates 100 tactical cartoon female animal avatars using DALL-E 3
 *
 * Usage: node scripts/generate-avatars-female.js
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

// 100 Female Animals - mix of different and overlapping with male set
const ANIMALS = [
  // Elegant Birds (18)
  'Swan', 'Dove', 'Hummingbird', 'Peacock', 'Flamingo', 'Crane', 'Heron', 'Songbird',
  'Cardinal', 'BlueJay', 'Finch', 'Sparrow', 'Nightingale', 'Lark', 'Wren', 'Robin',
  'Oriole', 'Starling',

  // Felines - overlapping (15)
  'Lioness', 'Tigress', 'Leopardess', 'Cheetah', 'Panther', 'Jaguar', 'Lynx', 'Ocelot',
  'Caracal', 'Serval', 'Wildcat', 'Cougar', 'Puma', 'Bobcat', 'Margay',

  // Canines (10)
  'Vixen', 'SheWolf', 'Coyote', 'Dingo', 'Husky', 'Malinois', 'Collie', 'Samoyed',
  'Shiba', 'Akita',

  // Graceful Mammals (15)
  'Doe', 'Gazelle', 'Antelope', 'Impala', 'Springbok', 'Oryx', 'Ibex', 'Chamois',
  'Eland', 'Kudu', 'Nyala', 'Sable', 'Gemsbok', 'Bongo', 'Okapi',

  // Fierce Predators (12)
  'Orca', 'Dolphin', 'Shark', 'Barracuda', 'Manta', 'Stingray', 'Piranha', 'Moray',
  'Marlin', 'Sailfish', 'Swordfish', 'Wahoo',

  // Exotic (12)
  'Peacock', 'Parrot', 'Macaw', 'Cockatoo', 'Toucan', 'Quetzal', 'Phoenix', 'Firebird',
  'Thunderbird', 'Harpy', 'Siren', 'Valkyrie',

  // Reptiles & Others (10)
  'Cobra', 'Viper', 'Mamba', 'Python', 'Anaconda', 'Asp', 'Taipan', 'Krait',
  'Gecko', 'Chameleon',

  // Mythical (8)
  'Dragon', 'Griffin', 'Sphinx', 'Chimera', 'Hydra', 'Basilisk', 'Wyvern', 'Pegasus'
];

const STYLE_PROMPT = 'feminine tactical cartoon style, obviously female character, wearing shooting ear protection headset with pink or purple accents, confident fierce expression, military tactical gear, elegant but tough, simple flat design, circular frame, dark background, no text, video game character avatar';

const OUTPUT_DIR = join(__dirname, '..', 'frontend', 'public', 'avatars', 'female');

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

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

// Generate a single avatar
async function generateAvatar(animal, index) {
  const filename = `${animal.toLowerCase()}.png`;
  const filepath = join(OUTPUT_DIR, filename);

  // Skip if already exists
  if (existsSync(filepath)) {
    console.log(`[${index + 1}/100] Skipping ${animal} (already exists)`);
    return { animal, status: 'skipped' };
  }

  const prompt = `A female ${animal}, ${STYLE_PROMPT}`;

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
  console.log('QDog Female Avatar Generator');
  console.log(`Generating ${ANIMALS.length} tactical female animal avatars`);
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
    total: ANIMALS.length,
    gender: 'female'
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
