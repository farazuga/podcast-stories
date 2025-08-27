/**
 * Password Generator Utility
 * Generates secure, kid-friendly passwords for teacher accounts
 */

const crypto = require('crypto');

// Kid-friendly word lists
const wordLists = {
  animals: [
    'dolphin', 'elephant', 'butterfly', 'penguin', 'koala',
    'giraffe', 'panda', 'tiger', 'rabbit', 'fox',
    'lion', 'zebra', 'monkey', 'turtle', 'eagle',
    'bear', 'kangaroo', 'owl', 'parrot', 'whale'
  ],
  colors: [
    'blue', 'green', 'purple', 'orange', 'yellow',
    'pink', 'red', 'silver', 'gold', 'rainbow',
    'turquoise', 'coral', 'indigo', 'violet', 'jade',
    'amber', 'crimson', 'emerald', 'sapphire', 'ruby'
  ],
  objects: [
    'rocket', 'castle', 'bridge', 'garden', 'mountain',
    'ocean', 'star', 'moon', 'cloud', 'flower',
    'book', 'compass', 'treasure', 'crystal', 'diamond',
    'piano', 'guitar', 'balloon', 'kite', 'puzzle'
  ],
  actions: [
    'jump', 'dance', 'sing', 'play', 'swim',
    'fly', 'run', 'climb', 'explore', 'discover',
    'create', 'build', 'paint', 'draw', 'dream',
    'laugh', 'smile', 'shine', 'glow', 'sparkle'
  ]
};

/**
 * Get a cryptographically secure random element from an array
 * @param {Array} array - The array to select from
 * @returns {any} Random element from the array
 */
function getSecureRandomElement(array) {
  const randomIndex = crypto.randomInt(0, array.length);
  return array[randomIndex];
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate a kid-friendly password using word combinations
 * Format: ColorAnimalAction123
 * @param {Object} options - Generation options
 * @returns {string} Generated password
 */
function generateKidFriendlyPassword(options = {}) {
  const {
    wordCount = 3,
    addNumbers = true,
    numberCount = 3,
    capitalize: shouldCapitalize = true,
    separator = ''
  } = options;

  // Select words from different categories
  const wordCategories = [
    wordLists.colors,
    wordLists.animals,
    wordLists.actions
  ];

  const selectedWords = [];
  for (let i = 0; i < Math.min(wordCount, wordCategories.length); i++) {
    const word = getSecureRandomElement(wordCategories[i]);
    selectedWords.push(shouldCapitalize ? capitalize(word) : word);
  }

  // Join words
  let password = selectedWords.join(separator);

  // Add numbers if requested
  if (addNumbers) {
    const numbers = [];
    for (let i = 0; i < numberCount; i++) {
      numbers.push(crypto.randomInt(0, 10).toString());
    }
    password += numbers.join('');
  }

  return password;
}

/**
 * Generate a secure password with more complexity
 * @param {Object} options - Generation options
 * @returns {string} Generated password
 */
function generateSecurePassword(options = {}) {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true
  } = options;

  let charset = '';
  if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeNumbers) charset += '0123456789';
  if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!charset) {
    throw new Error('At least one character type must be included');
  }

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  return password;
}

/**
 * Validate that a generated password meets security requirements
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
function validateGeneratedPassword(password) {
  const result = {
    valid: true,
    errors: [],
    strength: 'weak',
    entropy: 0
  };

  // Check minimum length
  if (password.length < 8) {
    result.valid = false;
    result.errors.push('Password must be at least 8 characters long');
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    result.valid = false;
    result.errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    result.valid = false;
    result.errors.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    result.valid = false;
    result.errors.push('Password must contain at least one number');
  }

  // Calculate entropy
  const charsetSize = 
    (/[a-z]/.test(password) ? 26 : 0) +
    (/[A-Z]/.test(password) ? 26 : 0) +
    (/[0-9]/.test(password) ? 10 : 0) +
    (/[^a-zA-Z0-9]/.test(password) ? 32 : 0);
  
  result.entropy = Math.floor(Math.log2(Math.pow(charsetSize, password.length)));

  // Determine strength based on entropy
  if (result.entropy >= 60) {
    result.strength = 'strong';
  } else if (result.entropy >= 40) {
    result.strength = 'moderate';
  } else {
    result.strength = 'weak';
  }

  return result;
}

/**
 * Generate multiple unique passwords
 * @param {number} count - Number of passwords to generate
 * @param {Object} options - Generation options
 * @returns {Array} Array of unique passwords
 */
function generateMultiplePasswords(count = 5, options = {}) {
  const passwords = new Set();
  const maxAttempts = count * 10; // Prevent infinite loop
  let attempts = 0;

  while (passwords.size < count && attempts < maxAttempts) {
    const password = generateKidFriendlyPassword(options);
    passwords.add(password);
    attempts++;
  }

  return Array.from(passwords);
}

/**
 * Get password generation statistics
 * @returns {Object} Statistics about the password generator
 */
function getPasswordStats() {
  return {
    wordListSizes: {
      animals: wordLists.animals.length,
      colors: wordLists.colors.length,
      objects: wordLists.objects.length,
      actions: wordLists.actions.length
    },
    totalWords: Object.values(wordLists).reduce((total, list) => total + list.length, 0),
    possibleCombinations: {
      threeWords: wordLists.colors.length * wordLists.animals.length * wordLists.actions.length,
      withNumbers: wordLists.colors.length * wordLists.animals.length * wordLists.actions.length * 1000
    },
    estimatedEntropy: {
      kidFriendly: Math.floor(Math.log2(wordLists.colors.length * wordLists.animals.length * wordLists.actions.length * 1000)),
      secure16Char: Math.floor(Math.log2(Math.pow(62, 16))) // uppercase + lowercase + numbers
    }
  };
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateKidFriendlyPassword,
    generateSecurePassword,
    validateGeneratedPassword,
    generateMultiplePasswords,
    getPasswordStats,
    wordLists
  };
}

// Export for browser (if needed for testing)
if (typeof window !== 'undefined') {
  window.passwordGenerator = {
    generateKidFriendlyPassword,
    generateSecurePassword,
    validateGeneratedPassword,
    generateMultiplePasswords,
    getPasswordStats,
    wordLists
  };
}