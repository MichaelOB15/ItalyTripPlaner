/**
 * Random Itinerary Name Generator
 * 
 * Generates fun, creative names for AI-generated itineraries
 */

const adjectives = [
  'Amazing',
  'Magical',
  'Wonderful',
  'Epic',
  'Enchanting',
  'Delightful',
  'Splendid',
  'Grand',
  'Marvelous',
  'Fabulous',
  'Unforgettable',
  'Spectacular',
  'Incredible',
  'Glorious',
  'Perfect',
  'Dreamy',
  'Golden',
  'Bella',
  'Dolce',
  'Romantic',
];

const nouns = [
  'Adventure',
  'Journey',
  'Escape',
  'Expedition',
  'Voyage',
  'Discovery',
  'Experience',
  'Tour',
  'Getaway',
  'Quest',
  'Odyssey',
  'Exploration',
  'Sojourn',
  'Wanderlust',
  'Dreams',
  'Memories',
  'Holiday',
  'Vacation',
];

const italianWords = [
  'Dolce Vita',
  'La Bella',
  'Ciao Bella',
  'Amore',
  'Bellissimo',
  'Magnifico',
  'Paradiso',
  'Sogno',
  'Stella',
  'Luna',
  'Mare',
  'Sole',
];

/**
 * Generates a random itinerary name with Italian flair
 * 
 * Examples:
 * - "Amazing Italian Adventure"
 * - "My Dolce Vita Journey"
 * - "Epic Italian Escape"
 * - "Bella Italy Dreams"
 * 
 * @returns A randomly generated itinerary name
 */
export function generateRandomItineraryName(): string {
  const random = Math.random();
  
  // 30% chance for Italian-inspired name
  if (random < 0.3) {
    const italian = italianWords[Math.floor(Math.random() * italianWords.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `My ${italian} ${noun}`;
  }
  
  // 70% chance for adjective + Italian + noun
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} Italian ${noun}`;
}
