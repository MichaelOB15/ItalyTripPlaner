// Simple validation script to test filter logic without Jest/Vitest
// Run with: node validate-filter-logic.mjs

const PlaceType = {
  RESTAURANT: 'restaurant',
  MUSEUM: 'museum',
  PARK: 'park'
};

const createMockPlace = (overrides) => ({
  id: 'place_001',
  name: 'Test Place',
  type: PlaceType.RESTAURANT,
  city: 'Rome',
  latitude: 41.9028,
  longitude: 12.4964,
  description: 'A test place',
  tags: ['italian', 'historic'],
  price_range: '€€',
  rating: 4.5,
  ...overrides
});

function matchesFilters(place, filters) {
  // City filter
  if (filters.cities.length > 0 && !filters.cities.includes(place.city)) {
    return false;
  }

  // Type filter
  if (filters.types.length > 0 && !filters.types.includes(place.type)) {
    return false;
  }

  // Tags filter - place must have at least one matching tag
  if (filters.tags.length > 0) {
    const placeTags = place.tags || [];
    const hasMatchingTag = filters.tags.some(filterTag => 
      placeTags.includes(filterTag)
    );
    if (!hasMatchingTag) {
      return false;
    }
  }

  // Price range filter
  if (filters.priceRanges.length > 0) {
    const placePriceRange = place.price_range || '€';
    if (!filters.priceRanges.includes(placePriceRange)) {
      return false;
    }
  }

  // Search query filter
  if (filters.searchQuery.trim() !== '') {
    const query = filters.searchQuery.toLowerCase();
    const nameMatch = place.name.toLowerCase().includes(query);
    const descriptionMatch = place.description?.toLowerCase().includes(query) || false;
    
    if (!nameMatch && !descriptionMatch) {
      return false;
    }
  }

  // Coordinates filter
  if (filters.hasCoordinates === true) {
    if (place.latitude == null || place.longitude == null) {
      return false;
    }
  }

  return true;
}

// Test cases
console.log('Testing FilterContext logic...\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passCount++;
  } catch (error) {
    console.log(`✗ ${name}: ${error.message}`);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test: Empty filters should match all places
test('Empty filters match all places', () => {
  const place = createMockPlace();
  const filters = {
    cities: [],
    types: [],
    tags: [],
    priceRanges: [],
    searchQuery: ''
  };
  assert(matchesFilters(place, filters), 'Should match with empty filters');
});

// Test: City filter
test('City filter matches when city is in list', () => {
  const place = createMockPlace({ city: 'Rome' });
  const filters = {
    cities: ['Rome', 'Florence'],
    types: [],
    tags: [],
    priceRanges: [],
    searchQuery: ''
  };
  assert(matchesFilters(place, filters), 'Should match Rome');
});

test('City filter rejects when city is not in list', () => {
  const place = createMockPlace({ city: 'Venice' });
  const filters = {
    cities: ['Rome', 'Florence'],
    types: [],
    tags: [],
    priceRanges: [],
    searchQuery: ''
  };
  assert(!matchesFilters(place, filters), 'Should not match Venice');
});

// Test: Type filter
test('Type filter matches when type is in list', () => {
  const place = createMockPlace({ type: 'restaurant' });
  const filters = {
    cities: [],
    types: ['restaurant', 'museum'],
    tags: [],
    priceRanges: [],
    searchQuery: ''
  };
  assert(matchesFilters(place, filters), 'Should match restaurant type');
});

// Test: Tags filter
test('Tags filter matches when place has matching tag', () => {
  const place = createMockPlace({ tags: ['italian', 'historic'] });
  const filters = {
    cities: [],
    types: [],
    tags: ['historic', 'romantic'],
    priceRanges: [],
    searchQuery: ''
  };
  assert(matchesFilters(place, filters), 'Should match historic tag');
});

test('Tags filter rejects when no matching tags', () => {
  const place = createMockPlace({ tags: ['italian', 'modern'] });
  const filters = {
    cities: [],
    types: [],
    tags: ['historic', 'romantic'],
    priceRanges: [],
    searchQuery: ''
  };
  assert(!matchesFilters(place, filters), 'Should not match without matching tags');
});

// Test: Price range filter
test('Price range filter matches', () => {
  const place = createMockPlace({ price_range: '€€' });
  const filters = {
    cities: [],
    types: [],
    tags: [],
    priceRanges: ['€', '€€'],
    searchQuery: ''
  };
  assert(matchesFilters(place, filters), 'Should match €€ price range');
});

test('Price range filter uses default for null', () => {
  const place = createMockPlace({ price_range: null });
  const filters = {
    cities: [],
    types: [],
    tags: [],
    priceRanges: ['€'],
    searchQuery: ''
  };
  assert(matchesFilters(place, filters), 'Should match default € price range');
});

// Test: Search query
test('Search query matches name', () => {
  const place = createMockPlace({ name: 'The Colosseum' });
  const filters = {
    cities: [],
    types: [],
    tags: [],
    priceRanges: [],
    searchQuery: 'colosseum'
  };
  assert(matchesFilters(place, filters), 'Should match colosseum in name');
});

test('Search query matches description', () => {
  const place = createMockPlace({ 
    name: 'Historic Site',
    description: 'Visit the amazing Colosseum' 
  });
  const filters = {
    cities: [],
    types: [],
    tags: [],
    priceRanges: [],
    searchQuery: 'colosseum'
  };
  assert(matchesFilters(place, filters), 'Should match colosseum in description');
});

test('Search query ignores whitespace', () => {
  const place = createMockPlace({ name: 'Colosseum' });
  const filters = {
    cities: [],
    types: [],
    tags: [],
    priceRanges: [],
    searchQuery: '   '
  };
  assert(matchesFilters(place, filters), 'Should ignore whitespace-only query');
});

// Test: Coordinates filter
test('Coordinates filter matches place with coordinates', () => {
  const place = createMockPlace({ latitude: 41.9028, longitude: 12.4964 });
  const filters = {
    cities: [],
    types: [],
    tags: [],
    priceRanges: [],
    searchQuery: '',
    hasCoordinates: true
  };
  assert(matchesFilters(place, filters), 'Should match place with coordinates');
});

test('Coordinates filter rejects place without coordinates', () => {
  const place = createMockPlace({ latitude: null, longitude: null });
  const filters = {
    cities: [],
    types: [],
    tags: [],
    priceRanges: [],
    searchQuery: '',
    hasCoordinates: true
  };
  assert(!matchesFilters(place, filters), 'Should reject place without coordinates');
});

// Test: Combined filters
test('Combined filters apply AND logic across categories', () => {
  const place = createMockPlace({
    city: 'Rome',
    type: 'restaurant',
    tags: ['italian', 'historic'],
    price_range: '€€',
    name: 'Historic Italian Restaurant',
    latitude: 41.9028,
    longitude: 12.4964
  });
  const filters = {
    cities: ['Rome'],
    types: ['restaurant'],
    tags: ['historic'],
    priceRanges: ['€€'],
    searchQuery: 'italian',
    hasCoordinates: true
  };
  assert(matchesFilters(place, filters), 'Should match all combined filters');
});

test('Combined filters reject when one criterion fails', () => {
  const place = createMockPlace({
    city: 'Rome',
    type: 'restaurant',
    tags: ['italian'],
    price_range: '€€€€'
  });
  const filters = {
    cities: ['Rome'],
    types: ['restaurant'],
    tags: ['italian'],
    priceRanges: ['€', '€€'],
    searchQuery: ''
  };
  assert(!matchesFilters(place, filters), 'Should reject when price range does not match');
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Tests: ${passCount} passed, ${failCount} failed`);
console.log(`${'='.repeat(50)}\n`);

if (failCount > 0) {
  process.exit(1);
}
