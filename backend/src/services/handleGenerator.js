/**
 * Handle and Avatar Generator Service
 * Generates unique tactical handles and assigns avatars for queue entries
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Shooting-themed adjectives
const ADJECTIVES = [
  'Steady', 'Quick', 'Sharp', 'Silent', 'Iron', 'Steel', 'True', 'Swift',
  'Calm', 'Ready', 'Locked', 'Loaded', 'Primed', 'Zeroed', 'Scoped',
  'Sighted', 'Aimed', 'Tactical', 'Stealth', 'Rapid', 'Precise', 'Cold',
  'Hot', 'Wild', 'Lone', 'Alpha', 'Bravo', 'Delta', 'Echo', 'Ghost'
];

// All 100 animals (must match generated avatars)
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

/**
 * Get a random element from an array
 */
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random number between min and max (inclusive)
 */
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a handle in format: AdjectiveAnimal##
 * e.g., "SteadyHawk42", "LoadedWolf17"
 */
function generateHandleCandidate() {
  const adjective = randomFrom(ADJECTIVES);
  const animal = randomFrom(ANIMALS);
  const number = randomNumber(1, 99);
  return `${adjective}${animal}${number}`;
}

/**
 * Generate a unique handle that doesn't exist in the database
 * Tries up to maxAttempts times before giving up
 */
export async function generateUniqueHandle(maxAttempts = 50) {
  for (let i = 0; i < maxAttempts; i++) {
    const handle = generateHandleCandidate();

    // Check if handle already exists
    const existing = await prisma.queueEntry.findUnique({
      where: { handle }
    });

    if (!existing) {
      return handle;
    }
  }

  // Fallback: add timestamp to ensure uniqueness
  const handle = generateHandleCandidate();
  return `${handle}${Date.now() % 1000}`;
}

/**
 * Get a random avatar (animal name in lowercase)
 */
export function getRandomAvatar() {
  return randomFrom(ANIMALS).toLowerCase();
}

/**
 * Generate both a unique handle and avatar
 * The avatar animal will match the animal in the handle
 */
export async function generateHandleAndAvatar() {
  const adjective = randomFrom(ADJECTIVES);
  const animal = randomFrom(ANIMALS);

  // Try to create a unique handle with this animal
  for (let num = randomNumber(1, 99), attempts = 0; attempts < 100; attempts++) {
    const handle = `${adjective}${animal}${num}`;

    const existing = await prisma.queueEntry.findUnique({
      where: { handle }
    });

    if (!existing) {
      return {
        handle,
        avatar: animal.toLowerCase()
      };
    }

    // Try next number
    num = (num % 99) + 1;
  }

  // Fallback with timestamp
  const num = Date.now() % 1000;
  return {
    handle: `${adjective}${animal}${num}`,
    avatar: animal.toLowerCase()
  };
}

/**
 * Get list of all available avatars
 */
export function getAvailableAvatars() {
  return ANIMALS.map(a => a.toLowerCase());
}

/**
 * Get list of all adjectives
 */
export function getAdjectives() {
  return [...ADJECTIVES];
}

export default {
  generateUniqueHandle,
  getRandomAvatar,
  generateHandleAndAvatar,
  getAvailableAvatars,
  getAdjectives
};
