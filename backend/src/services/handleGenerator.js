/**
 * Handle and Avatar Generator Service
 * Generates unique tactical handles and assigns avatars for queue entries
 * Reads available animals from manifest files (synced with actual PNG files)
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Path to avatar directories
// __dirname is /app/src/services/ in container, so go up twice to /app/, then into public/avatars
const AVATARS_DIR = join(__dirname, '..', '..', 'public', 'avatars');
const MALE_MANIFEST = join(AVATARS_DIR, 'manifest.json');
const FEMALE_MANIFEST = join(AVATARS_DIR, 'female', 'manifest.json');

// Shooting-themed adjectives
const ADJECTIVES = [
  'Steady', 'Quick', 'Sharp', 'Silent', 'Iron', 'Steel', 'True', 'Swift',
  'Calm', 'Ready', 'Locked', 'Loaded', 'Primed', 'Zeroed', 'Scoped',
  'Sighted', 'Aimed', 'Tactical', 'Stealth', 'Rapid', 'Precise', 'Cold',
  'Hot', 'Wild', 'Lone', 'Alpha', 'Bravo', 'Delta', 'Echo', 'Ghost'
];

// Cache for animal lists (loaded from manifests)
let maleAnimals = [];
let femaleAnimals = [];
let lastManifestLoad = 0;

/**
 * Convert lowercase animal name to PascalCase for display
 * e.g., "bluejay" -> "BlueJay", "shewolf" -> "SheWolf"
 */
function toPascalCase(str) {
  // Special cases for compound names
  const specialCases = {
    'bluejay': 'BlueJay',
    'shewolf': 'SheWolf',
    'honeybadger': 'HoneyBadger'
  };

  if (specialCases[str.toLowerCase()]) {
    return specialCases[str.toLowerCase()];
  }

  // Default: capitalize first letter
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Load animal lists from manifest files
 */
function loadManifests() {
  try {
    if (existsSync(MALE_MANIFEST)) {
      const data = JSON.parse(readFileSync(MALE_MANIFEST, 'utf8'));
      maleAnimals = data.animals || [];
      console.log(`Loaded ${maleAnimals.length} male animals from manifest`);
    } else {
      console.warn('Male manifest not found, using empty list');
      maleAnimals = [];
    }
  } catch (err) {
    console.error('Failed to load male manifest:', err.message);
    maleAnimals = [];
  }

  try {
    if (existsSync(FEMALE_MANIFEST)) {
      const data = JSON.parse(readFileSync(FEMALE_MANIFEST, 'utf8'));
      femaleAnimals = data.animals || [];
      console.log(`Loaded ${femaleAnimals.length} female animals from manifest`);
    } else {
      console.warn('Female manifest not found, using empty list');
      femaleAnimals = [];
    }
  } catch (err) {
    console.error('Failed to load female manifest:', err.message);
    femaleAnimals = [];
  }

  lastManifestLoad = Date.now();
}

/**
 * Refresh manifests by scanning actual PNG files in the directories
 * Returns the updated animal counts
 */
export function refreshManifests() {
  const results = { male: 0, female: 0, errors: [] };

  try {
    // Scan male avatars
    const maleDir = AVATARS_DIR;
    if (existsSync(maleDir)) {
      const files = readdirSync(maleDir)
        .filter(f => f.endsWith('.png') && f !== 'placeholder.png')
        .map(f => f.replace('.png', ''));

      const manifest = {
        animals: files,
        generated: new Date().toISOString(),
        total: files.length,
        gender: 'male'
      };

      writeFileSync(MALE_MANIFEST, JSON.stringify(manifest, null, 2));
      results.male = files.length;
    }
  } catch (err) {
    results.errors.push(`Male: ${err.message}`);
  }

  try {
    // Scan female avatars
    const femaleDir = join(AVATARS_DIR, 'female');
    if (existsSync(femaleDir)) {
      const files = readdirSync(femaleDir)
        .filter(f => f.endsWith('.png') && f !== 'placeholder.png')
        .map(f => f.replace('.png', ''));

      const manifest = {
        animals: files,
        generated: new Date().toISOString(),
        total: files.length,
        gender: 'female'
      };

      writeFileSync(FEMALE_MANIFEST, JSON.stringify(manifest, null, 2));
      results.female = files.length;
    }
  } catch (err) {
    results.errors.push(`Female: ${err.message}`);
  }

  // Reload the cached lists
  loadManifests();

  return results;
}

/**
 * Get a random element from an array
 */
function randomFrom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random number between min and max (inclusive)
 */
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get animals array based on sex
 */
function getAnimalsForSex(sex) {
  // Ensure manifests are loaded
  if (maleAnimals.length === 0 && femaleAnimals.length === 0) {
    loadManifests();
  }
  return sex === 'female' ? femaleAnimals : maleAnimals;
}

/**
 * Get avatar path based on sex
 * Returns placeholder path if the animal isn't found
 */
function getAvatarPath(animal, sex) {
  const animalLower = animal.toLowerCase();
  return sex === 'female' ? `female/${animalLower}` : animalLower;
}

/**
 * Generate a preview (handle + avatar) without saving to DB
 * Used for the re-roll feature
 */
export function generatePreview(sex = 'male') {
  const adjective = randomFrom(ADJECTIVES);
  const animals = getAnimalsForSex(sex);
  const animal = randomFrom(animals);

  // Fallback if no animals available
  if (!animal) {
    return {
      handle: `${adjective}Unknown${randomNumber(1, 99)}`,
      avatar: sex === 'female' ? 'female/placeholder' : 'placeholder',
      animal: 'unknown'
    };
  }

  const number = randomNumber(1, 99);
  const displayName = toPascalCase(animal);

  return {
    handle: `${adjective}${displayName}${number}`,
    avatar: getAvatarPath(animal, sex),
    animal: animal.toLowerCase()
  };
}

/**
 * Generate a unique handle that doesn't exist in the database
 */
export async function generateUniqueHandle(sex = 'male', maxAttempts = 50) {
  const animals = getAnimalsForSex(sex);

  for (let i = 0; i < maxAttempts; i++) {
    const adjective = randomFrom(ADJECTIVES);
    const animal = randomFrom(animals);
    if (!animal) break;

    const displayName = toPascalCase(animal);
    const number = randomNumber(1, 99);
    const handle = `${adjective}${displayName}${number}`;

    const existing = await prisma.queueEntry.findUnique({
      where: { handle }
    });

    if (!existing) {
      return handle;
    }
  }

  // Fallback: add timestamp to ensure uniqueness
  const adjective = randomFrom(ADJECTIVES);
  const animal = randomFrom(animals) || 'Unknown';
  const displayName = toPascalCase(animal);
  return `${adjective}${displayName}${Date.now() % 1000}`;
}

/**
 * Generate both a unique handle and avatar
 * The avatar animal will match the animal in the handle
 */
export async function generateHandleAndAvatar(sex = 'male') {
  const adjective = randomFrom(ADJECTIVES);
  const animals = getAnimalsForSex(sex);
  const animal = randomFrom(animals);

  // Fallback if no animals
  if (!animal) {
    return {
      handle: `${adjective}Unknown${Date.now() % 1000}`,
      avatar: sex === 'female' ? 'female/placeholder' : 'placeholder'
    };
  }

  const displayName = toPascalCase(animal);

  // Try to create a unique handle with this animal
  for (let num = randomNumber(1, 99), attempts = 0; attempts < 100; attempts++) {
    const handle = `${adjective}${displayName}${num}`;

    const existing = await prisma.queueEntry.findUnique({
      where: { handle }
    });

    if (!existing) {
      return {
        handle,
        avatar: getAvatarPath(animal, sex)
      };
    }

    // Try next number
    num = (num % 99) + 1;
  }

  // Fallback with timestamp
  const num = Date.now() % 1000;
  return {
    handle: `${adjective}${displayName}${num}`,
    avatar: getAvatarPath(animal, sex)
  };
}

/**
 * Validate that a handle is unique and return it with avatar
 * Used when user submits with a specific preview
 */
export async function validateAndReserveHandle(handle, avatar) {
  const existing = await prisma.queueEntry.findUnique({
    where: { handle }
  });

  if (existing) {
    // Handle was taken while user was previewing, generate new one
    // Detect sex from avatar path
    const sex = avatar.startsWith('female/') ? 'female' : 'male';
    return generateHandleAndAvatar(sex);
  }

  return { handle, avatar };
}

/**
 * Get list of all available avatars for a given sex
 */
export function getAvailableAvatars(sex = 'male') {
  const animals = getAnimalsForSex(sex);
  return animals.map(a => getAvatarPath(a, sex));
}

/**
 * Get list of all adjectives
 */
export function getAdjectives() {
  return [...ADJECTIVES];
}

/**
 * Get current manifest info
 */
export function getManifestInfo() {
  return {
    male: maleAnimals.length,
    female: femaleAnimals.length,
    lastLoaded: lastManifestLoad ? new Date(lastManifestLoad).toISOString() : null
  };
}

// Load manifests on module initialization
loadManifests();

export default {
  generatePreview,
  generateUniqueHandle,
  generateHandleAndAvatar,
  validateAndReserveHandle,
  getAvailableAvatars,
  getAdjectives,
  refreshManifests,
  getManifestInfo
};
