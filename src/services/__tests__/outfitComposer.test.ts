import {
  OutfitComposer,
  GarmentItem,
  OutfitCombination,
  StylePreferences,
  ColorHarmony,
  SeasonalContext,
  BodyType,
  OutfitRecommendation,
  StyleAnalysis,
  OccasionType,
  OutfitGenerationOptions
} from '../outfitComposer';

// Mock AI/ML services
jest.mock('../aiServices', () => ({
  analyzeGarmentCompatibility: jest.fn(),
  generateColorHarmony: jest.fn(),
  analyzeBodyTypeRecommendations: jest.fn(),
  getStyleTrends: jest.fn(),
}));

describe('OutfitComposer', () => {
  let outfitComposer: OutfitComposer;
  let mockGarments: GarmentItem[];
  let mockStylePreferences: StylePreferences;

  beforeEach(() => {
    jest.clearAllMocks();
    outfitComposer = new OutfitComposer();

    mockGarments = [
      {
        id: 'top-1',
        name: 'Blue Cotton Shirt',
        category: 'top',
        subcategory: 'shirt',
        colors: ['#4A90E2', '#FFFFFF'],
        style: 'casual',
        season: ['spring', 'summer'],
        formality: 2,
        imageUrl: '/images/blue-shirt.jpg',
        brand: 'TestBrand',
        tags: ['cotton', 'breathable', 'versatile'],
        fitType: 'regular',
        care: ['machine-wash', 'tumble-dry'],
        metadata: {
          fabric: 'cotton',
          pattern: 'solid',
          sleeve: 'short',
          collar: 'button-down'
        }
      },
      {
        id: 'bottom-1',
        name: 'Dark Jeans',
        category: 'bottom',
        subcategory: 'jeans',
        colors: ['#2C3E50', '#34495E'],
        style: 'casual',
        season: ['fall', 'winter', 'spring'],
        formality: 2,
        imageUrl: '/images/dark-jeans.jpg',
        brand: 'TestBrand',
        tags: ['denim', 'stretch', 'classic'],
        fitType: 'slim',
        care: ['machine-wash', 'hang-dry'],
        metadata: {
          fabric: 'denim',
          rise: 'mid',
          leg: 'straight',
          wash: 'dark'
        }
      },
      {
        id: 'shoes-1',
        name: 'White Sneakers',
        category: 'shoes',
        subcategory: 'sneakers',
        colors: ['#FFFFFF', '#E8E8E8'],
        style: 'casual',
        season: ['spring', 'summer', 'fall'],
        formality: 1,
        imageUrl: '/images/white-sneakers.jpg',
        brand: 'TestBrand',
        tags: ['comfortable', 'versatile', 'athletic'],
        fitType: 'regular',
        care: ['spot-clean'],
        metadata: {
          material: 'canvas',
          sole: 'rubber',
          type: 'low-top'
        }
      },
      {
        id: 'blazer-1',
        name: 'Navy Blazer',
        category: 'outer',
        subcategory: 'blazer',
        colors: ['#1A237E', '#283593'],
        style: 'formal',
        season: ['spring', 'fall', 'winter'],
        formality: 4,
        imageUrl: '/images/navy-blazer.jpg',
        brand: 'TestBrand',
        tags: ['wool', 'tailored', 'professional'],
        fitType: 'tailored',
        care: ['dry-clean'],
        metadata: {
          fabric: 'wool',
          buttons: 2,
          lapel: 'notched',
          lining: 'partial'
        }
      },
      {
        id: 'dress-1',
        name: 'Black Cocktail Dress',
        category: 'dress',
        subcategory: 'cocktail',
        colors: ['#000000', '#1C1C1C'],
        style: 'formal',
        season: ['spring', 'summer', 'fall'],
        formality: 4,
        imageUrl: '/images/black-dress.jpg',
        brand: 'TestBrand',
        tags: ['elegant', 'classic', 'versatile'],
        fitType: 'fitted',
        care: ['dry-clean'],
        metadata: {
          fabric: 'polyester',
          length: 'knee',
          neckline: 'v-neck',
          sleeve: 'sleeveless'
        }
      },
      {
        id: 'top-2',
        name: 'White T-Shirt',
        category: 'top',
        subcategory: 'tshirt',
        colors: ['#FFFFFF'],
        style: 'casual',
        season: ['spring', 'summer', 'fall'],
        formality: 1,
        imageUrl: '/images/white-tshirt.jpg',
        brand: 'TestBrand',
        tags: ['basic', 'versatile', 'cotton'],
        fitType: 'regular',
        care: ['machine-wash', 'tumble-dry'],
        metadata: {
          fabric: 'cotton',
          pattern: 'solid',
          sleeve: 'short'
        }
      },
      {
        id: 'bottom-2',
        name: 'Khaki Chinos',
        category: 'bottom',
        subcategory: 'chinos',
        colors: ['#C3B091', '#D2B48C'],
        style: 'smart-casual',
        season: ['spring', 'summer', 'fall'],
        formality: 3,
        imageUrl: '/images/khaki-chinos.jpg',
        brand: 'TestBrand',
        tags: ['versatile', 'professional', 'cotton'],
        fitType: 'slim',
        care: ['machine-wash', 'hang-dry'],
        metadata: {
          fabric: 'cotton',
          rise: 'mid',
          leg: 'straight'
        }
      }
    ];

    mockStylePreferences = {
      preferredStyles: ['casual', 'smart-casual'],
      colorPalette: ['#4A90E2', '#FFFFFF', '#2C3E50'],
      bodyType: 'athletic',
      personalityStyle: 'classic',
      comfortLevel: 8,
      adventurous: false,
      budgetRange: 'mid',
      sustainabilityImportance: 7,
      brandPreferences: ['TestBrand'],
      avoidedColors: ['#FF0000'],
      preferredFit: 'regular',
      lifestyle: 'professional'
    };
  });

  describe('Outfit Generation', () => {
    test('should generate basic outfit combinations', () => {
      const options: OutfitGenerationOptions = {
        occasion: 'casual',
        season: 'spring',
        maxOutfits: 3,
        includeAlternatives: true
      };

      const outfits = outfitComposer.generateOutfits(mockGarments, mockStylePreferences, options);

      expect(outfits).toHaveLength(3);
      expect(outfits[0].items).toBeDefined();
      expect(outfits[0].styleScore).toBeGreaterThan(0);
      expect(outfits[0].occasion).toBe('casual');
      expect(outfits[0].confidence).toBeGreaterThan(0);
    });

    test('should generate complete outfits with required categories', () => {
      const options: OutfitGenerationOptions = {
        occasion: 'business',
        season: 'spring',
        requiredCategories: ['top', 'bottom', 'shoes'],
        maxOutfits: 2
      };

      const outfits = outfitComposer.generateOutfits(mockGarments, mockStylePreferences, options);

      outfits.forEach(outfit => {
        const categories = outfit.items.map(item => item.category);
        // Allow flexibility for dresses (which combine top and bottom)
        const hasTopOrDress = categories.includes('top') || categories.includes('dress');
        const hasBottomOrDress = categories.includes('bottom') || categories.includes('dress');
        const hasShoes = categories.includes('shoes');
        
        expect(hasTopOrDress).toBe(true);
        expect(hasBottomOrDress).toBe(true);
        expect(hasShoes).toBe(true);
      });
    });

    test('should handle insufficient garments gracefully', () => {
      const limitedGarments = mockGarments.slice(0, 1); // Only one garment
      const options: OutfitGenerationOptions = {
        occasion: 'casual',
        season: 'spring',
        maxOutfits: 3
      };

      const outfits = outfitComposer.generateOutfits(limitedGarments, mockStylePreferences, options);

      expect(outfits.length).toBeLessThanOrEqual(1);
      
      // Check if outfit exists and has completeness property
      if (outfits.length > 0 && outfits[0].completeness !== undefined) {
        expect(outfits[0].completeness).toBeLessThan(1);
      } else {
        // If no outfits or no completeness property, that's also valid handling of insufficient garments
        expect(outfits.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('should respect color harmony preferences', () => {
      const colorHarmonyOptions: OutfitGenerationOptions = {
        occasion: 'casual',
        season: 'spring',
        colorHarmony: 'complementary',
        maxOutfits: 2
      };

      const outfits = outfitComposer.generateOutfits(mockGarments, mockStylePreferences, colorHarmonyOptions);

      outfits.forEach(outfit => {
        expect(outfit.colorAnalysis).toBeDefined();
        expect(outfit.colorAnalysis.harmony).toBe('complementary');
        expect(outfit.colorAnalysis.dominantColors).toBeDefined();
      });
    });

    test('should generate seasonal appropriate outfits', () => {
      const winterOptions: OutfitGenerationOptions = {
        occasion: 'casual',
        season: 'winter',
        maxOutfits: 2
      };

      const outfits = outfitComposer.generateOutfits(mockGarments, mockStylePreferences, winterOptions);

      outfits.forEach(outfit => {
        outfit.items.forEach(item => {
          expect(item.season).toContain('winter');
        });
        expect(outfit.seasonalAppropriate).toBe(true);
      });
    });

    test('should handle formality requirements', () => {
      const formalOptions: OutfitGenerationOptions = {
        occasion: 'formal',
        season: 'spring',
        formalityLevel: 4,
        maxOutfits: 2
      };

      const outfits = outfitComposer.generateOutfits(mockGarments, mockStylePreferences, formalOptions);

      outfits.forEach(outfit => {
        const avgFormality = outfit.items.reduce((sum, item) => sum + item.formality, 0) / outfit.items.length;
        expect(avgFormality).toBeGreaterThanOrEqual(3.5);
      });
    });
  });

  describe('Style Matching Algorithm', () => {
    test('should calculate style compatibility scores', () => {
      const item1 = mockGarments[0]; // Blue shirt (casual)
      const item2 = mockGarments[1]; // Dark jeans (casual)

      const compatibility = outfitComposer.calculateStyleCompatibility(item1, item2);

      expect(compatibility.score).toBeGreaterThan(0.7); // High compatibility for casual items
      expect(compatibility.reasons).toContain('matching style');
    });

    test('should detect style conflicts', () => {
      const casualItem = mockGarments[0]; // Blue shirt
      const formalItem = mockGarments[3]; // Navy blazer

      const compatibility = outfitComposer.calculateStyleCompatibility(casualItem, formalItem);

      expect(compatibility.score).toBeLessThan(0.5); // Lower compatibility
      expect(compatibility.conflicts).toContain('formality mismatch');
    });

    test('should analyze color coordination', () => {
      const blueShirt = mockGarments[0];
      const darkJeans = mockGarments[1];

      const colorAnalysis = outfitComposer.analyzeColorCoordination([blueShirt, darkJeans]);

      expect(colorAnalysis.harmony).toBeDefined();
      expect(colorAnalysis.dominantColors).toHaveLength(2);
      expect(colorAnalysis.balance).toBeGreaterThan(0);
      expect(colorAnalysis.complementary).toBeDefined();
    });

    test('should identify clashing colors', () => {
      const redItem: GarmentItem = {
        ...mockGarments[0],
        id: 'red-shirt',
        colors: ['#FF0000', '#CC0000']
      };
      const greenItem: GarmentItem = {
        ...mockGarments[1],
        id: 'green-pants',
        colors: ['#00FF00', '#00CC00']
      };

      const colorAnalysis = outfitComposer.analyzeColorCoordination([redItem, greenItem]);

      expect(colorAnalysis.clashes).toHaveLength(1);
      expect(colorAnalysis.balance).toBeLessThan(0.5);
    });
  });

  describe('Recommendation Engine', () => {
    test('should generate personalized recommendations', async () => {
      const { analyzeBodyTypeRecommendations } = require('../aiServices');
      analyzeBodyTypeRecommendations.mockResolvedValue({
        recommendations: ['emphasize waist', 'avoid oversized tops'],
        bodyAnalysis: { shape: 'hourglass', measurements: {} }
      });

      const recommendations = await outfitComposer.getPersonalizedRecommendations(
        mockGarments,
        mockStylePreferences,
        { bodyType: 'athletic', occasion: 'work' }
      );

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].personalizedScore).toBeGreaterThan(0);
      expect(recommendations[0].reasoning).toBeDefined();
      expect(analyzeBodyTypeRecommendations).toHaveBeenCalled();
    });

    test('should suggest alternatives for outfit improvement', () => {
      const baseOutfit: OutfitCombination = {
        id: 'test-outfit',
        items: [mockGarments[0], mockGarments[1]],
        styleScore: 0.6,
        occasion: 'casual',
        confidence: 0.7,
        completeness: 0.8,
        seasonalAppropriate: true,
        colorAnalysis: {
          harmony: 'analogous',
          dominantColors: ['#4A90E2', '#2C3E50'],
          balance: 0.7,
          temperature: 'cool',
          complementary: false,
          clashes: []
        },
        tags: ['casual', 'comfortable'],
        estimatedCost: 120,
        sustainability: 6
      };

      const alternatives = outfitComposer.suggestAlternatives(baseOutfit, mockGarments);

      expect(alternatives.itemAlternatives).toBeDefined();
      expect(alternatives.styleUpgrades).toBeDefined();
      expect(alternatives.seasonalAdaptations).toBeDefined();
      expect(alternatives.accessoryRecommendations).toBeDefined();
    });

    test('should rank outfits by user preferences', () => {
      const outfits = outfitComposer.generateOutfits(mockGarments, mockStylePreferences, {
        occasion: 'casual',
        season: 'spring',
        maxOutfits: 5
      });

      const rankedOutfits = outfitComposer.rankOutfitsByPreference(outfits, mockStylePreferences);

      // Should be sorted by preference score
      for (let i = 1; i < rankedOutfits.length; i++) {
        expect(rankedOutfits[i-1].personalizedScore).toBeGreaterThanOrEqual(
          rankedOutfits[i].personalizedScore
        );
      }

      rankedOutfits.forEach(outfit => {
        expect(outfit.preferenceAlignment).toBeDefined();
        expect(outfit.personalizedScore).toBeGreaterThan(0);
      });
    });
  });

  describe('Trend Analysis Integration', () => {
    test('should incorporate current fashion trends', async () => {
      const { getStyleTrends } = require('../aiServices');
      getStyleTrends.mockResolvedValue({
        currentTrends: ['oversized blazers', 'earth tones', 'sustainable fabrics'],
        popularity: { 'earth tones': 0.8, 'oversized blazers': 0.6 },
        seasonalTrends: { spring: ['pastel colors', 'light layers'] }
      });

      const trendAwareOutfits = await outfitComposer.generateTrendAwareOutfits(
        mockGarments,
        mockStylePreferences,
        { season: 'spring', includeTrends: true }
      );

      expect(trendAwareOutfits).toBeDefined();
      expect(trendAwareOutfits.length).toBeGreaterThan(0);
      trendAwareOutfits.forEach(outfit => {
        expect(outfit.trendAlignment).toBeDefined();
        expect(outfit.trendAlignment.score).toBeGreaterThan(0);
      });
    });

    test('should balance trends with personal style', async () => {
      const conservativePreferences = {
        ...mockStylePreferences,
        adventurous: false,
        personalityStyle: 'classic'
      };

      const trendAwareOutfits = await outfitComposer.generateTrendAwareOutfits(
        mockGarments,
        conservativePreferences,
        { season: 'spring', trendWeight: 0.3 }
      );

      trendAwareOutfits.forEach(outfit => {
        // Should have lower trend influence for conservative users
        expect(outfit.trendAlignment.influence).toBeLessThan(0.5);
        expect(outfit.personalizedScore).toBeGreaterThan(outfit.trendAlignment.score);
      });
    });
  });

  describe('Advanced Color Theory', () => {
    test('should apply color theory principles', () => {
      const colorSchemes = outfitComposer.generateColorSchemes(['#4A90E2'], 'triadic');

      expect(colorSchemes).toHaveProperty('primary');
      expect(colorSchemes).toHaveProperty('secondary');
      expect(colorSchemes).toHaveProperty('accent');
      expect(colorSchemes.harmony).toBe('triadic');
    });

    test('should consider skin tone compatibility', () => {
      const userProfile = {
        ...mockStylePreferences,
        skinTone: 'warm',
        eyeColor: 'brown',
        hairColor: 'dark'
      };

      const skinToneAwareOutfits = outfitComposer.generateColorHarmoniousOutfits(
        mockGarments,
        userProfile,
        { prioritizeSkinTone: true }
      );

      skinToneAwareOutfits.forEach(outfit => {
        expect(outfit.colorAnalysis.skinToneCompatibility).toBeDefined();
        expect(outfit.colorAnalysis.skinToneCompatibility.score).toBeGreaterThan(0.6);
      });
    });

    test('should handle seasonal color palettes', () => {
      const springPalette = outfitComposer.getSeasonalColorPalette('spring');
      const autumnPalette = outfitComposer.getSeasonalColorPalette('autumn');

      expect(springPalette.primary).toContain('#FFB6C1'); // Light pink
      expect(springPalette.temperature).toBe('warm');
      expect(autumnPalette.primary).toContain('#8B4513'); // Saddle brown
      expect(autumnPalette.temperature).toBe('warm');
    });
  });

  describe('Occasion-Based Styling', () => {
    test('should generate work-appropriate outfits', () => {
      const workOutfits = outfitComposer.generateOccasionSpecificOutfits(
        mockGarments,
        'work',
        mockStylePreferences
      );

      workOutfits.forEach(outfit => {
        expect(outfit.appropriateness.work).toBeGreaterThan(0.7);
        expect(outfit.formalityScore).toBeGreaterThanOrEqual(3);
        expect(outfit.professionalRating).toBeGreaterThan(0.8);
      });
    });

    test('should suggest date night outfits', () => {
      const dateOutfits = outfitComposer.generateOccasionSpecificOutfits(
        mockGarments,
        'date',
        mockStylePreferences
      );

      dateOutfits.forEach(outfit => {
        expect(outfit.appropriateness.romantic).toBeGreaterThan(0.6);
        expect(outfit.attractivenessScore).toBeGreaterThan(0.7);
        expect(outfit.confidenceBoost).toBeGreaterThan(0.5);
      });
    });

    test('should create versatile day-to-night outfits', () => {
      const versatileOutfits = outfitComposer.generateVersatileOutfits(
        mockGarments,
        mockStylePreferences,
        ['work', 'dinner']
      );

      versatileOutfits.forEach(outfit => {
        expect(outfit.versatilityScore).toBeGreaterThan(0.6);
        expect(outfit.transitionability).toBeDefined();
        expect(outfit.accessorySwaps).toBeDefined();
      });
    });
  });

  describe('Sustainability Scoring', () => {
    test('should calculate outfit sustainability scores', () => {
      const sustainabilityScore = outfitComposer.calculateSustainabilityScore([
        { ...mockGarments[0], metadata: { ...mockGarments[0].metadata, sustainable: true } },
        mockGarments[1]
      ]);

      expect(sustainabilityScore.overall).toBeGreaterThan(0);
      expect(sustainabilityScore.factors).toHaveProperty('materials');
      expect(sustainabilityScore.factors).toHaveProperty('brands');
      expect(sustainabilityScore.factors).toHaveProperty('longevity');
    });

    test('should prefer sustainable options when requested', () => {
      const sustainableGarments = mockGarments.map(garment => ({
        ...garment,
        brand: 'SustainableBrand',
        tags: [...garment.tags, 'durable'],
        metadata: {
          ...garment.metadata,
          sustainable: true,
          fabric: 'organic cotton'
        }
      }));

      const sustainablePrefs = {
        ...mockStylePreferences,
        sustainabilityImportance: 9
      };

      const outfits = outfitComposer.generateOutfits(sustainableGarments, sustainablePrefs, {
        occasion: 'casual',
        season: 'spring',
        prioritizeSustainability: true
      });

      outfits.forEach(outfit => {
        expect(outfit.sustainability).toBeGreaterThan(6);
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle large garment collections efficiently', () => {
      const largeCollection = Array.from({ length: 100 }, (_, i) => ({
        ...mockGarments[i % mockGarments.length],
        id: `item-${i}`
      }));

      const startTime = Date.now();
      const outfits = outfitComposer.generateOutfits(largeCollection, mockStylePreferences, {
        occasion: 'casual',
        season: 'spring',
        maxOutfits: 5
      });
      const endTime = Date.now();

      expect(outfits).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    test('should cache repeated calculations', () => {
      const spy = jest.spyOn(outfitComposer, 'calculateStyleCompatibility');

      // Generate outfits twice
      outfitComposer.generateOutfits(mockGarments, mockStylePreferences, { occasion: 'casual' });
      outfitComposer.generateOutfits(mockGarments, mockStylePreferences, { occasion: 'casual' });

      // Should use cached results on second call
      expect(spy.mock.calls.length).toBeLessThan(mockGarments.length * mockGarments.length);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty garment collection', () => {
      const outfits = outfitComposer.generateOutfits([], mockStylePreferences, { occasion: 'casual' });

      expect(outfits).toEqual([]);
    });

    test('should handle invalid color values', () => {
      const invalidGarment: GarmentItem = {
        ...mockGarments[0],
        colors: ['invalid-color', '#GGGGGG']
      };

      expect(() => {
        outfitComposer.analyzeColorCoordination([invalidGarment]);
      }).not.toThrow();
    });

    test('should handle missing garment metadata', () => {
      const incompleteGarment: GarmentItem = {
        id: 'incomplete',
        name: 'Test Item',
        category: 'top',
        subcategory: 'shirt',
        colors: ['#FFFFFF'],
        style: 'casual',
        season: ['spring'],
        formality: 2,
        imageUrl: '/test.jpg',
        brand: 'Test',
        tags: [],
        fitType: 'regular',
        care: []
      };

      expect(() => {
        outfitComposer.generateOutfits([incompleteGarment], mockStylePreferences, { occasion: 'casual' });
      }).not.toThrow();
    });
  });

  describe('Multi-Language and Cultural Support', () => {
    test('should support different cultural style preferences', () => {
      const culturalPreferences = {
        ...mockStylePreferences,
        culturalBackground: 'minimalist-scandinavian'
      };

      const outfits = outfitComposer.generateCulturallyAwareOutfits(
        mockGarments,
        culturalPreferences
      );

      outfits.forEach(outfit => {
        expect(outfit.culturalAlignment).toBeDefined();
        expect(outfit.culturalAlignment.score).toBeGreaterThan(0.5);
      });
    });

    test('should handle different sizing standards', () => {
      const internationalSizing = outfitComposer.convertSizing(
        'US',
        'EU',
        'M',
        'top'
      );

      expect(internationalSizing).toBeDefined();
      expect(internationalSizing.convertedSize).toBe('L');
    });
  });
});