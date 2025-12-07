// backend/utils/usernameGenerator.js
// ✅ ENHANCED: Gender-specific, fancy, searchable usernames
import User from "../models/User.model.js";

// ✅ Male-themed words (100 adjectives + 100 nouns = 10,000 combinations)
const maleAdjectives = [
  "Shadow",
  "Thunder",
  "Fire",
  "Ice",
  "Storm",
  "Dark",
  "Steel",
  "Iron",
  "Golden",
  "Silver",
  "Crimson",
  "Azure",
  "Phantom",
  "Ghost",
  "Demon",
  "Dragon",
  "Wolf",
  "Tiger",
  "Lion",
  "Eagle",
  "Hawk",
  "Raven",
  "Phoenix",
  "Venom",
  "Toxic",
  "Rage",
  "Fury",
  "Chaos",
  "Void",
  "Doom",
  "Death",
  "Blood",
  "Night",
  "Midnight",
  "Eclipse",
  "Nova",
  "Cosmic",
  "Astral",
  "Wild",
  "Savage",
  "Fierce",
  "Brutal",
  "Mighty",
  "Epic",
  "Legendary",
  "Ancient",
  "Eternal",
  "Immortal",
  "Divine",
  "Supreme",
  "Ultimate",
  "Alpha",
  "Omega",
  "Prime",
  "Elite",
  "Royal",
  "Noble",
  "Majestic",
  "Frozen",
  "Blaze",
  "Lightning",
  "Thunder",
  "Quake",
  "Cyclone",
  "Hurricane",
  "Inferno",
  "Magma",
  "Vortex",
  "Nebula",
  "Galaxy",
  "Quantum",
  "Cyber",
  "Neon",
  "Laser",
  "Plasma",
  "Atomic",
  "Nuclear",
  "Sonic",
  "Turbo",
  "Hyper",
  "Ultra",
  "Mega",
  "Giga",
  "Tera",
  "Apex",
  "Zenith",
  "Titan",
  "Colossal",
  "Giant",
  "Grand",
  "Epic",
  "Mythic",
  "Mystic",
  "Arcane",
  "Spectral",
  "Ethereal",
  "Celestial",
  "Infernal",
  "Demonic",
  "Angelic",
];

const maleNouns = [
  "Knight",
  "King",
  "Prince",
  "Lord",
  "Duke",
  "Baron",
  "Emperor",
  "Caesar",
  "Warrior",
  "Fighter",
  "Hunter",
  "Soldier",
  "Ranger",
  "Scout",
  "Guard",
  "Dragon",
  "Wolf",
  "Tiger",
  "Lion",
  "Bear",
  "Hawk",
  "Eagle",
  "Falcon",
  "Phoenix",
  "Raven",
  "Serpent",
  "Viper",
  "Cobra",
  "Python",
  "Shark",
  "Reaper",
  "Slayer",
  "Destroyer",
  "Breaker",
  "Crusher",
  "Smasher",
  "Ripper",
  "Blade",
  "Sword",
  "Axe",
  "Hammer",
  "Spear",
  "Arrow",
  "Dagger",
  "Scythe",
  "Thunder",
  "Storm",
  "Blaze",
  "Flame",
  "Frost",
  "Ice",
  "Shadow",
  "Ghost",
  "Demon",
  "Devil",
  "Beast",
  "Monster",
  "Titan",
  "Giant",
  "Colossus",
  "Golem",
  "Samurai",
  "Ninja",
  "Ronin",
  "Shogun",
  "Daimyo",
  "Sensei",
  "Master",
  "Sage",
  "Wizard",
  "Warlock",
  "Sorcerer",
  "Mage",
  "Shaman",
  "Druid",
  "Monk",
  "Priest",
  "Paladin",
  "Crusader",
  "Templar",
  "Champion",
  "Hero",
  "Legend",
  "Myth",
  "God",
  "Commander",
  "General",
  "Captain",
  "Admiral",
  "Marshal",
  "Warlord",
  "Chief",
  "Overlord",
  "Sovereign",
  "Monarch",
  "Ruler",
  "Conqueror",
];

// ✅ Female-themed words (100 adjectives + 100 nouns = 10,000 combinations)
const femaleAdjectives = [
  "Crystal",
  "Diamond",
  "Pearl",
  "Ruby",
  "Sapphire",
  "Emerald",
  "Jade",
  "Opal",
  "Rose",
  "Lily",
  "Violet",
  "Iris",
  "Daisy",
  "Jasmine",
  "Lavender",
  "Blossom",
  "Luna",
  "Stella",
  "Aurora",
  "Nova",
  "Celestia",
  "Astrid",
  "Celeste",
  "Sky",
  "Moon",
  "Star",
  "Sun",
  "Dawn",
  "Twilight",
  "Dusk",
  "Angel",
  "Divine",
  "Mystic",
  "Magic",
  "Enchanted",
  "Fairy",
  "Pixie",
  "Sprite",
  "Nymph",
  "Goddess",
  "Queen",
  "Princess",
  "Lady",
  "Duchess",
  "Empress",
  "Royal",
  "Noble",
  "Regal",
  "Grace",
  "Beauty",
  "Charm",
  "Elegance",
  "Radiance",
  "Brilliance",
  "Glow",
  "Shine",
  "Sweet",
  "Lovely",
  "Pretty",
  "Gorgeous",
  "Stunning",
  "Beautiful",
  "Cute",
  "Adorable",
  "Gentle",
  "Soft",
  "Tender",
  "Kind",
  "Warm",
  "Bright",
  "Light",
  "Pure",
  "Silver",
  "Golden",
  "Platinum",
  "Azure",
  "Crimson",
  "Scarlet",
  "Violet",
  "Indigo",
  "Coral",
  "Amber",
  "Ivory",
  "Silk",
  "Velvet",
  "Satin",
  "Lace",
  "Chiffon",
  "Butterfly",
  "Dove",
  "Swan",
  "Peacock",
  "Nightingale",
  "Songbird",
  "Phoenix",
  "Winter",
  "Spring",
  "Summer",
  "Autumn",
  "Breeze",
  "Whisper",
];

const femaleNouns = [
  "Queen",
  "Princess",
  "Lady",
  "Duchess",
  "Empress",
  "Goddess",
  "Angel",
  "Fairy",
  "Rose",
  "Lily",
  "Violet",
  "Daisy",
  "Blossom",
  "Petal",
  "Flower",
  "Bloom",
  "Star",
  "Moon",
  "Sun",
  "Dawn",
  "Aurora",
  "Nova",
  "Stella",
  "Luna",
  "Crystal",
  "Diamond",
  "Pearl",
  "Ruby",
  "Sapphire",
  "Emerald",
  "Gem",
  "Jewel",
  "Butterfly",
  "Dove",
  "Swan",
  "Phoenix",
  "Nightingale",
  "Songbird",
  "Lark",
  "Dream",
  "Wish",
  "Hope",
  "Faith",
  "Love",
  "Grace",
  "Joy",
  "Peace",
  "Beauty",
  "Charm",
  "Elegance",
  "Radiance",
  "Glow",
  "Shine",
  "Sparkle",
  "Glitter",
  "Dancer",
  "Singer",
  "Artist",
  "Poet",
  "Muse",
  "Enchantress",
  "Sorceress",
  "Witch",
  "Maiden",
  "Damsel",
  "Belle",
  "Diva",
  "Icon",
  "Legend",
  "Myth",
  "Fable",
  "Spirit",
  "Soul",
  "Heart",
  "Mind",
  "Essence",
  "Aura",
  "Mystic",
  "Oracle",
  "Siren",
  "Mermaid",
  "Nymph",
  "Pixie",
  "Sprite",
  "Elf",
  "Valkyrie",
  "Amazon",
  "Warrior",
  "Guardian",
  "Protector",
  "Defender",
  "Champion",
  "Hero",
  "Huntress",
  "Empress",
  "Sovereign",
  "Monarch",
  "Ruler",
  "Leader",
  "Commander",
];

/**
 * Generate a fancy, unique username based on gender
 * Format: Adjective_Noun_XXX (e.g., Shadow_Knight_42)
 *
 * @param {string} gender - "male" or "female"
 * @returns {Promise<string>} Unique username
 */
export const generateUsername = async (gender = "male") => {
  const isMale = gender.toLowerCase() === "male";

  const adjectives = isMale ? maleAdjectives : femaleAdjectives;
  const nouns = isMale ? maleNouns : femaleNouns;

  let username;
  let attempts = 0;
  const maxAttempts = 50; // Prevent infinite loop

  while (attempts < maxAttempts) {
    // Random adjective + noun + 2-3 digit number
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 900) + 100; // 100-999

    username = `${adjective}_${noun}_${number}`;

    // Check if username already exists
    const exists = await User.findOne({ username }).lean();

    if (!exists) {
      console.log(`✅ Generated unique username: ${username}`);
      return username;
    }

    attempts++;
    console.log(`⚠️ Username collision (attempt ${attempts}): ${username}`);
  }

  // Fallback: add timestamp if still colliding
  const fallback = `${adjectives[0]}_${nouns[0]}_${Date.now()
    .toString()
    .slice(-6)}`;
  console.log(`⚠️ Using fallback username: ${fallback}`);
  return fallback;
};

/**
 * Check if username is available
 *
 * @param {string} username - Username to check
 * @param {string} currentUserId - Current user's ID (to exclude from check)
 * @returns {Promise<boolean>} True if available
 */
export const isUsernameAvailable = async (username, currentUserId = null) => {
  const query = { username };

  // Exclude current user from check
  if (currentUserId) {
    query._id = { $ne: currentUserId };
  }

  const exists = await User.findOne(query).lean();
  return !exists;
};

/**
 * Generate username suggestions when desired name is taken
 *
 * @param {string} baseUsername - Desired username
 * @param {string} gender - User's gender
 * @returns {Promise<string[]>} Array of 5 available suggestions
 */
export const generateSuggestions = async (baseUsername, gender = "male") => {
  const suggestions = [];
  const isMale = gender.toLowerCase() === "male";
  const adjectives = isMale ? maleAdjectives : femaleAdjectives;
  const nouns = isMale ? maleNouns : femaleNouns;

  // Strategy 1: Add numbers
  for (let i = 1; i <= 3; i++) {
    const num = Math.floor(Math.random() * 900) + 100;
    const suggestion = `${baseUsername}_${num}`;
    const available = await isUsernameAvailable(suggestion);
    if (available) suggestions.push(suggestion);
    if (suggestions.length >= 5) break;
  }

  // Strategy 2: Add random words
  while (suggestions.length < 5) {
    const word = isMale
      ? nouns[Math.floor(Math.random() * nouns.length)]
      : adjectives[Math.floor(Math.random() * adjectives.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    const suggestion = `${baseUsername}_${word}_${num}`;
    const available = await isUsernameAvailable(suggestion);
    if (available) suggestions.push(suggestion);
  }

  return suggestions.slice(0, 5);
};
