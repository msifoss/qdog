/**
 * Handle and Avatar Generator Service
 * Generates unique tactical handles and assigns avatars for queue entries
 * Supports male and female avatar sets
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

// Male animals (must match generated avatars in /avatars/)
const MALE_ANIMALS = [
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
  'HoneyBadger', 'Ratel', 'Armadillo', 'Pangolin',

  // Mythical (11)
  'Dragon', 'Griffin', 'Chimera', 'Cerberus', 'Hydra', 'Basilisk', 'Wyvern',
  'Manticore', 'Thunderbird', 'Fenrir', 'Kraken'
];

// Female animals (must match generated avatars in /avatars/female/)
const FEMALE_ANIMALS = [
  // Elegant Birds (18)
  'Swan', 'Dove', 'Hummingbird', 'Peacock', 'Flamingo', 'Crane', 'Heron', 'Songbird',
  'Cardinal', 'BlueJay', 'Finch', 'Sparrow', 'Nightingale', 'Lark', 'Wren', 'Robin',
  'Oriole', 'Starling',

  // Felines (15)
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
  'Parrot', 'Macaw', 'Cockatoo', 'Toucan', 'Quetzal', 'Phoenix', 'Firebird',
  'Thunderbird', 'Harpy', 'Siren', 'Valkyrie', 'Raven',

  // Reptiles (8)
  'Cobra', 'Viper', 'Mamba', 'Python', 'Anaconda', 'Asp', 'Taipan', 'Krait',

  // Mythical (8)
  'Dragon', 'Griffin', 'Sphinx', 'Chimera', 'Hydra', 'Basilisk', 'Wyvern', 'Pegasus'
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
 * Get animals array based on sex
 */
function getAnimalsForSex(sex) {
  return sex === 'female' ? FEMALE_ANIMALS : MALE_ANIMALS;
}

/**
 * Get avatar path based on sex
 */
function getAvatarPath(animal, sex) {
  const animalLower = animal.toLowerCase();
  return sex === 'female' ? `female/${animalLower}` : animalLower;
}

/**
 * Generate a handle candidate for given sex
 */
function generateHandleCandidate(sex = 'male') {
  const adjective = randomFrom(ADJECTIVES);
  const animals = getAnimalsForSex(sex);
  const animal = randomFrom(animals);
  const number = randomNumber(1, 99);
  return { handle: `${adjective}${animal}${number}`, animal };
}

/**
 * Generate a preview (handle + avatar) without saving to DB
 * Used for the re-roll feature
 */
export function generatePreview(sex = 'male') {
  const adjective = randomFrom(ADJECTIVES);
  const animals = getAnimalsForSex(sex);
  const animal = randomFrom(animals);
  const number = randomNumber(1, 99);

  return {
    handle: `${adjective}${animal}${number}`,
    avatar: getAvatarPath(animal, sex),
    animal: animal.toLowerCase()
  };
}

/**
 * Generate a unique handle that doesn't exist in the database
 */
export async function generateUniqueHandle(sex = 'male', maxAttempts = 50) {
  for (let i = 0; i < maxAttempts; i++) {
    const { handle } = generateHandleCandidate(sex);

    const existing = await prisma.queueEntry.findUnique({
      where: { handle }
    });

    if (!existing) {
      return handle;
    }
  }

  // Fallback: add timestamp to ensure uniqueness
  const { handle } = generateHandleCandidate(sex);
  return `${handle}${Date.now() % 1000}`;
}

/**
 * Generate both a unique handle and avatar
 * The avatar animal will match the animal in the handle
 */
export async function generateHandleAndAvatar(sex = 'male') {
  const adjective = randomFrom(ADJECTIVES);
  const animals = getAnimalsForSex(sex);
  const animal = randomFrom(animals);

  // Try to create a unique handle with this animal
  for (let num = randomNumber(1, 99), attempts = 0; attempts < 100; attempts++) {
    const handle = `${adjective}${animal}${num}`;

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
    handle: `${adjective}${animal}${num}`,
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

export default {
  generatePreview,
  generateUniqueHandle,
  generateHandleAndAvatar,
  validateAndReserveHandle,
  getAvailableAvatars,
  getAdjectives
};
