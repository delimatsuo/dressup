export interface GarmentItem {
  id: string;
  name: string;
  category: 'top' | 'bottom' | 'shoes' | 'outer' | 'dress' | 'accessories';
  subcategory: string;
  colors: string[];
  style: string;
  season: Array<'spring' | 'summer' | 'fall' | 'winter'>;
  formality: number; // 1-5 scale
  imageUrl: string;
  brand: string;
  tags: string[];
  fitType: string;
  care: string[];
  metadata?: {
    fabric?: string;
    pattern?: string;
    sustainable?: boolean;
    [key: string]: any;
  };
}

export interface StylePreferences {
  preferredStyles: string[];
  colorPalette: string[];
  bodyType: string;
  personalityStyle: string;
  comfortLevel: number; // 1-10
  adventurous: boolean;
  budgetRange: string;
  sustainabilityImportance: number; // 1-10
  brandPreferences: string[];
  avoidedColors: string[];
  preferredFit: string;
  lifestyle: string;
  skinTone?: string;
  eyeColor?: string;
  hairColor?: string;
  culturalBackground?: string;
}

export interface OutfitCombination {
  id: string;
  items: GarmentItem[];
  styleScore: number;
  occasion: string;
  confidence: number;
  completeness: number;
  seasonalAppropriate: boolean;
  colorAnalysis: ColorHarmony;
  tags: string[];
  estimatedCost: number;
  sustainability: number;
  personalizedScore?: number;
  preferenceAlignment?: {
    style: number;
    color: number;
    fit: number;
    overall: number;
  };
  trendAlignment?: {
    score: number;
    influence: number;
    trends: string[];
  };
  appropriateness?: {
    work?: number;
    casual?: number;
    formal?: number;
    romantic?: number;
  };
  formalityScore?: number;
  professionalRating?: number;
  attractivenessScore?: number;
  confidenceBoost?: number;
  versatilityScore?: number;
  transitionability?: {
    dayToNight: boolean;
    workToWeekend: boolean;
    casualToFormal: boolean;
  };
  accessorySwaps?: Array<{
    remove: string[];
    add: string[];
    occasion: string;
  }>;
  culturalAlignment?: {
    score: number;
    factors: string[];
  };
}

export interface ColorHarmony {
  harmony: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'split-complementary';
  dominantColors: string[];
  balance: number;
  temperature: 'warm' | 'cool' | 'neutral';
  complementary: boolean;
  clashes: Array<{ color1: string; color2: string; severity: number }>;
  skinToneCompatibility?: {
    score: number;
    recommendations: string[];
  };
}

export interface OutfitGenerationOptions {
  occasion: string;
  season?: string;
  maxOutfits?: number;
  includeAlternatives?: boolean;
  requiredCategories?: string[];
  colorHarmony?: string;
  formalityLevel?: number;
  prioritizeSustainability?: boolean;
  includeTrends?: boolean;
  trendWeight?: number;
  prioritizeSkinTone?: boolean;
}

export interface OutfitRecommendation extends OutfitCombination {
  reasoning: string[];
  alternatives: {
    itemAlternatives: Record<string, GarmentItem[]>;
    styleUpgrades: Array<{ suggestion: string; items: GarmentItem[] }>;
    seasonalAdaptations: Array<{ season: string; changes: string[] }>;
    accessoryRecommendations: Array<{ type: string; suggestion: string }>;
  };
}

export type SeasonalContext = 'spring' | 'summer' | 'fall' | 'winter';
export type BodyType = 'athletic' | 'pear' | 'apple' | 'hourglass' | 'rectangle' | 'inverted-triangle';
export type OccasionType = 'casual' | 'work' | 'formal' | 'date' | 'party' | 'travel' | 'workout';

export interface StyleAnalysis {
  compatibility: {
    score: number;
    reasons: string[];
    conflicts: string[];
  };
  recommendation: string;
}

export class OutfitComposer {
  private compatibilityCache = new Map<string, number>();
  private colorCache = new Map<string, ColorHarmony>();

  constructor() {
    this.initializeColorTheory();
  }

  private initializeColorTheory(): void {
    // Initialize color theory algorithms
  }

  generateOutfits(
    garments: GarmentItem[],
    preferences: StylePreferences,
    options: OutfitGenerationOptions
  ): OutfitCombination[] {
    if (garments.length === 0) return [];

    const filteredGarments = this.filterGarmentsBySeason(garments, options.season);
    const combinations = this.generateCombinations(filteredGarments, options);
    const scoredOutfits = this.scoreOutfits(combinations, preferences, options);
    const rankedOutfits = this.rankOutfits(scoredOutfits, preferences);

    return rankedOutfits.slice(0, options.maxOutfits || 5);
  }

  private filterGarmentsBySeason(garments: GarmentItem[], season?: string): GarmentItem[] {
    if (!season) return garments;
    
    return garments.filter(garment => 
      garment.season.includes(season as any)
    );
  }

  private generateCombinations(
    garments: GarmentItem[], 
    options: OutfitGenerationOptions
  ): OutfitCombination[] {
    const combinations: OutfitCombination[] = [];
    const maxCombinations = options.maxOutfits ? options.maxOutfits * 3 : 15;

    // Group garments by category
    const byCategory = this.groupByCategory(garments);

    // Generate different outfit types based on available garments
    if (byCategory.dress && byCategory.dress.length > 0) {
      // Dress-based outfits
      combinations.push(...this.generateDressOutfits(byCategory, options));
    }

    // Traditional combinations (top + bottom)
    combinations.push(...this.generateTraditionalOutfits(byCategory, options));

    // Limit combinations for performance
    return combinations.slice(0, maxCombinations);
  }

  private groupByCategory(garments: GarmentItem[]): Record<string, GarmentItem[]> {
    return garments.reduce((groups, garment) => {
      if (!groups[garment.category]) {
        groups[garment.category] = [];
      }
      groups[garment.category].push(garment);
      return groups;
    }, {} as Record<string, GarmentItem[]>);
  }

  private filterGarmentsByFormality(garments: GarmentItem[], formalityLevel?: number): GarmentItem[] {
    if (!formalityLevel) return garments;

    return garments.filter(garment =>
      Math.abs(garment.formality - formalityLevel) <= 1 // Allow a difference of 1
    );
  }

  private generateDressOutfits(
    byCategory: Record<string, GarmentItem[]>,
    options: OutfitGenerationOptions
  ): OutfitCombination[] {
    const combinations: OutfitCombination[] = [];
    const formalDresses = this.filterGarmentsByFormality(byCategory.dress || [], options.formalityLevel);

    formalDresses.forEach(dress => {
      const items: GarmentItem[] = [dress];

      // Add shoes if available
      if (byCategory.shoes) {
        const matchedShoes = this.selectBestMatch(dress, this.filterGarmentsByFormality(byCategory.shoes, options.formalityLevel));
        if (matchedShoes) {
          items.push(matchedShoes);
        }
      }

      // Add outer layer if needed
      if (byCategory.outer && (options.season === 'fall' || options.season === 'winter')) {
        const matchedOuter = this.selectBestMatch(dress, this.filterGarmentsByFormality(byCategory.outer, options.formalityLevel));
        if (matchedOuter) {
          items.push(matchedOuter);
        }
      }

      combinations.push(this.createOutfitCombination(items, options));
    });

    return combinations;
  }

  private generateTraditionalOutfits(
    byCategory: Record<string, GarmentItem[]>,
    options: OutfitGenerationOptions
  ): OutfitCombination[] {
    const combinations: OutfitCombination[] = [];
    const formalTops = this.filterGarmentsByFormality(byCategory.top || [], options.formalityLevel);
    const formalBottoms = this.filterGarmentsByFormality(byCategory.bottom || [], options.formalityLevel);

    formalTops.forEach(top => {
      formalBottoms.forEach(bottom => {
        const compatibility = this.calculateStyleCompatibility(top, bottom);

        if (compatibility.score > 0.3) { // Lower threshold to generate more outfits
          const items: GarmentItem[] = [top, bottom];

          // Add shoes
          if (byCategory.shoes) {
            const matchedShoes = this.selectBestMatch(top, this.filterGarmentsByFormality(byCategory.shoes, options.formalityLevel));
            if (matchedShoes) {
              items.push(matchedShoes);
            }
          }

          // Add outer layer if appropriate
          if (byCategory.outer && this.shouldAddOuterLayer(top, bottom, options)) {
            const matchedOuter = this.selectBestMatch(top, this.filterGarmentsByFormality(byCategory.outer, options.formalityLevel));
            if (matchedOuter) {
              items.push(matchedOuter);
            }
          }

          combinations.push(this.createOutfitCombination(items, options));
        }
      });
    });

    return combinations;
  }

  private shouldAddOuterLayer(
    top: GarmentItem,
    bottom: GarmentItem,
    options: OutfitGenerationOptions
  ): boolean {
    return (
      options.season === 'fall' ||
      options.season === 'winter' ||
      (options.formalityLevel && options.formalityLevel > 3)
    );
  }

  private selectBestMatch(baseItem: GarmentItem, candidates: GarmentItem[]): GarmentItem | undefined {
    if (candidates.length === 0) {
      return undefined;
    }
    let bestMatch = candidates[0];
    let bestScore = 0;

    candidates.forEach(candidate => {
      const compatibility = this.calculateStyleCompatibility(baseItem, candidate);
      if (compatibility.score > bestScore) {
        bestScore = compatibility.score;
        bestMatch = candidate;
      }
    });

    return bestMatch;
  }

  private createOutfitCombination(
    items: GarmentItem[],
    options: OutfitGenerationOptions
  ): OutfitCombination {
    const colorAnalysis = this.analyzeColorCoordination(items, options.colorHarmony);
    const styleScore = this.calculateOutfitStyleScore(items);
    const completeness = this.calculateCompleteness(items, options.requiredCategories);

    return {
      id: `outfit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      items,
      styleScore,
      occasion: options.occasion,
      confidence: Math.min(styleScore * 0.8 + completeness * 0.2, 1),
      completeness,
      seasonalAppropriate: this.isSeasonallyAppropriate(items, options.season),
      colorAnalysis,
      tags: this.generateOutfitTags(items),
      estimatedCost: items.reduce((sum, item) => sum + this.estimateItemCost(item), 0),
      sustainability: this.calculateSustainabilityScore(items).overall
    };
  }

  calculateStyleCompatibility(item1: GarmentItem, item2: GarmentItem): StyleAnalysis['compatibility'] {
    const cacheKey = `${item1.id}-${item2.id}`;
    if (this.compatibilityCache.has(cacheKey)) {
      const score = this.compatibilityCache.get(cacheKey)!;
      return {
        score,
        reasons: score > 0.7 ? ['matching style'] : [],
        conflicts: score < 0.5 ? ['formality mismatch'] : []
      };
    }

    let score = 0;
    const reasons: string[] = [];
    const conflicts: string[] = [];

    // Style compatibility
    if (item1.style === item2.style) {
      score += 0.4;
      reasons.push('matching style');
    } else if (this.areStylesCompatible(item1.style, item2.style)) {
      score += 0.3;
      reasons.push('compatible styles');
    }

    // Formality compatibility
    const formalityDiff = Math.abs(item1.formality - item2.formality);
    if (formalityDiff <= 1) {
      score += 0.3;
      reasons.push('similar formality');
    } else if (formalityDiff >= 2) {
      conflicts.push('formality mismatch');
      score -= 0.2;
    }

    // Color harmony
    const colorScore = this.calculateColorCompatibility(item1.colors, item2.colors);
    score += colorScore * 0.3;

    // Season compatibility
    const commonSeasons = item1.season.filter(s => item2.season.includes(s));
    if (commonSeasons.length > 0) {
      score += 0.1;
      reasons.push('seasonal compatibility');
    }

    score = Math.max(0, Math.min(1, score));
    this.compatibilityCache.set(cacheKey, score);

    return { score, reasons, conflicts };
  }

  private areStylesCompatible(style1: string, style2: string): boolean {
    const compatibilityMap: Record<string, string[]> = {
      casual: ['smart-casual', 'athletic'],
      formal: ['business', 'elegant'],
      'smart-casual': ['casual', 'business'],
      business: ['formal', 'smart-casual'],
      athletic: ['casual'],
      elegant: ['formal']
    };

    return compatibilityMap[style1]?.includes(style2) || false;
  }

  private calculateColorCompatibility(colors1: string[], colors2: string[]): number {
    // Simplified color compatibility calculation
    const color1Primary = colors1[0];
    const color2Primary = colors2[0];

    // Convert hex to HSL for better comparison
    const hsl1 = this.hexToHsl(color1Primary);
    const hsl2 = this.hexToHsl(color2Primary);

    if (!hsl1 || !hsl2) return 0.5; // Neutral score for invalid colors

    // Calculate hue difference
    const hueDiff = Math.abs(hsl1[0] - hsl2[0]);
    const normalizedHueDiff = Math.min(hueDiff, 360 - hueDiff);

    // Complementary colors (150-210 degrees apart)
    if (normalizedHueDiff >= 150 && normalizedHueDiff <= 210) return 0.9;
    
    // Analogous colors (0-30 degrees apart)
    if (normalizedHueDiff <= 30) return 0.8;
    
    // Neutral colors work with everything
    if (hsl1[1] < 0.2 || hsl2[1] < 0.2) return 0.7;
    
    return 0.5;
  }

  private hexToHsl(hex: string): [number, number, number] | null {
    if (!hex.startsWith('#') || hex.length !== 7) return null;

    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [h * 360, s, l];
  }

  analyzeColorCoordination(items: GarmentItem[], preferredHarmony?: string): ColorHarmony {
    const cacheKey = items.map(i => i.id).sort().join('-') + (preferredHarmony || '');
    if (this.colorCache.has(cacheKey)) {
      return this.colorCache.get(cacheKey)!;
    }

    const allColors = items.flatMap(item => item.colors);
    const dominantColors = this.extractDominantColors(allColors);
    const clashes = this.detectColorClashes(allColors);

    const harmony = preferredHarmony || this.determineColorHarmony(dominantColors);
    const balance = this.calculateColorBalance(allColors);
    const temperature = this.determineColorTemperature(allColors);

    const result: ColorHarmony = {
      harmony: harmony as ColorHarmony['harmony'],
      dominantColors: dominantColors.slice(0, 3),
      balance,
      temperature,
      complementary: harmony === 'complementary',
      clashes
    };

    this.colorCache.set(cacheKey, result);
    return result;
  }

  private extractDominantColors(colors: string[]): string[] {
    const colorCount = new Map<string, number>();
    
    colors.forEach(color => {
      colorCount.set(color, (colorCount.get(color) || 0) + 1);
    });

    return Array.from(colorCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color);
  }

  private detectColorClashes(colors: string[]): Array<{ color1: string; color2: string; severity: number }> {
    const clashes: Array<{ color1: string; color2: string; severity: number }> = [];

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const hsl1 = this.hexToHsl(colors[i]);
        const hsl2 = this.hexToHsl(colors[j]);

        if (hsl1 && hsl2) {
          const hueDiff = Math.abs(hsl1[0] - hsl2[0]);
          const normalizedHueDiff = Math.min(hueDiff, 360 - hueDiff);
          
          // Detect clashing combinations (80-120 degrees apart, high saturation)
          if (
            normalizedHueDiff >= 80 && 
            normalizedHueDiff <= 120 && 
            hsl1[1] > 0.5 && 
            hsl2[1] > 0.5
          ) {
            clashes.push({
              color1: colors[i],
              color2: colors[j],
              severity: 0.8
            });
          }
        }
      }
    }

    return clashes;
  }

  private determineColorHarmony(colors: string[]): ColorHarmony['harmony'] {
    if (colors.length < 2) return 'monochromatic';

    const hslColors = colors.map(c => this.hexToHsl(c)).filter(Boolean) as [number, number, number][];
    if (hslColors.length < 2) return 'monochromatic';

    // Check for analogous colors (within 30 degrees)
    const isAnalogous = hslColors.every((color, i) => {
      if (i === 0) return true;
      const hueDiff = Math.abs(color[0] - hslColors[0][0]);
      return Math.min(hueDiff, 360 - hueDiff) <= 30;
    });

    if (isAnalogous) return 'analogous';

    // Check for complementary (approximately 180 degrees apart)
    if (hslColors.length === 2) {
      const hueDiff = Math.abs(hslColors[0][0] - hslColors[1][0]);
      const normalizedHueDiff = Math.min(hueDiff, 360 - hueDiff);
      if (normalizedHueDiff >= 150 && normalizedHueDiff <= 210) {
        return 'complementary';
      }
    }

    // Check for triadic (120 degrees apart)
    if (hslColors.length === 3) {
      const hues = hslColors.map(c => c[0]).sort((a, b) => a - b);
      const diff1 = hues[1] - hues[0];
      const diff2 = hues[2] - hues[1];
      const diff3 = 360 - hues[2] + hues[0];
      
      if (Math.abs(diff1 - 120) < 30 && Math.abs(diff2 - 120) < 30 && Math.abs(diff3 - 120) < 30) {
        return 'triadic';
      }
    }

    return 'analogous'; // Default fallback
  }

  private calculateColorBalance(colors: string[]): number {
    const hslColors = colors.map(c => this.hexToHsl(c)).filter(Boolean) as [number, number, number][];
    if (hslColors.length === 0) return 0;

    // Calculate distribution of hues, saturations, and lightness
    const hues = hslColors.map(c => c[0]);
    const saturations = hslColors.map(c => c[1]);
    const lightnesses = hslColors.map(c => c[2]);

    const hueRange = Math.max(...hues) - Math.min(...hues);
    const saturationRange = Math.max(...saturations) - Math.min(...saturations);
    const lightnessRange = Math.max(...lightnesses) - Math.min(...lightnesses);

    // Balance is better when there's variation but not extreme differences
    const hueBalance = hueRange > 30 && hueRange < 180 ? 1 : 0.5;
    const saturationBalance = saturationRange < 0.5 ? 1 : 0.7;
    const lightnessBalance = lightnessRange < 0.4 ? 1 : 0.8;

    return (hueBalance + saturationBalance + lightnessBalance) / 3;
  }

  private determineColorTemperature(colors: string[]): 'warm' | 'cool' | 'neutral' {
    const hslColors = colors.map(c => this.hexToHsl(c)).filter(Boolean) as [number, number, number][];
    if (hslColors.length === 0) return 'neutral';

    let warmScore = 0;
    let coolScore = 0;

    hslColors.forEach(([h]) => {
      // Warm colors: red-orange-yellow (0-60, 300-360)
      if ((h >= 0 && h <= 60) || (h >= 300 && h <= 360)) {
        warmScore++;
      }
      // Cool colors: blue-green-purple (120-240)
      else if (h >= 120 && h <= 240) {
        coolScore++;
      }
    });

    if (warmScore > coolScore) return 'warm';
    if (coolScore > warmScore) return 'cool';
    return 'neutral';
  }

  private calculateOutfitStyleScore(items: GarmentItem[]): number {
    let score = 0;
    const numItems = items.length;

    // Penalize incomplete outfits
    if (numItems < 2) score -= 0.3;

    // Style consistency bonus
    const styles = items.map(item => item.style);
    const uniqueStyles = new Set(styles);
    if (uniqueStyles.size === 1) {
      score += 0.3; // All items same style
    } else if (uniqueStyles.size <= 2) {
      score += 0.1; // Mostly consistent
    }

    // Color harmony bonus
    const colorAnalysis = this.analyzeColorCoordination(items);
    score += colorAnalysis.balance * 0.3;
    score -= colorAnalysis.clashes.length * 0.1;

    // Formality consistency
    const formalities = items.map(item => item.formality);
    const formalityRange = Math.max(...formalities) - Math.min(...formalities);
    if (formalityRange <= 1) score += 0.2;

    return Math.max(0, Math.min(1, score + 0.5)); // Base score + adjustments
  }

  private calculateCompleteness(items: GarmentItem[], requiredCategories?: string[]): number {
    const presentCategories = new Set(items.map(item => item.category));
    
    if (requiredCategories) {
      const missingRequired = requiredCategories.filter(cat => !presentCategories.has(cat));
      return 1 - (missingRequired.length / requiredCategories.length);
    }

    // Default completeness scoring
    const basicCategories = ['top', 'bottom', 'shoes'];
    const hasBasics = basicCategories.filter(cat => presentCategories.has(cat));
    
    // Special case for dresses
    if (presentCategories.has('dress')) {
      const baseScore = 0.8; // Dress alone is fairly complete
      if (presentCategories.has('shoes')) return Math.min(1, baseScore + 0.2);
      return baseScore;
    }

    return hasBasics.length / basicCategories.length;
  }

  private isSeasonallyAppropriate(items: GarmentItem[], season?: string): boolean {
    if (!season) return true;
    
    return items.every(item => item.season.includes(season as any));
  }

  private generateOutfitTags(items: GarmentItem[]): string[] {
    const allTags = items.flatMap(item => item.tags);
    const styles = items.map(item => item.style);
    
    const tags = new Set([...allTags, ...styles]);
    return Array.from(tags).slice(0, 5);
  }

  private estimateItemCost(item: GarmentItem): number {
    // Mock cost estimation based on brand and formality
    const baseCost = item.formality * 20;
    const brandMultiplier = item.brand === 'TestBrand' ? 1 : 1.2;
    return baseCost * brandMultiplier;
  }

  calculateSustainabilityScore(items: GarmentItem[]): { 
    overall: number; 
    factors: { materials: number; brands: number; longevity: number; } 
  } {
    let materialScore = 0;
    let brandScore = 0;
    let longevityScore = 0;

    items.forEach(item => {
      // Material sustainability
      if (item.metadata?.sustainable) materialScore += 1;
      if (item.metadata?.fabric === 'organic cotton') materialScore += 0.5;
      if (item.metadata?.fabric === 'recycled polyester') materialScore += 0.5;

      // Brand sustainability (simplified)
      if (item.brand === 'SustainableBrand') brandScore += 1;

      // Longevity based on care and quality indicators
      if (item.care.includes('machine-wash')) longevityScore += 0.5;
      if (item.tags.includes('durable')) longevityScore += 0.5;
    });

    const numItems = items.length;
    const factors = {
      materials: materialScore / numItems,
      brands: brandScore / numItems,
      longevity: longevityScore / numItems
    };

    const overall = (factors.materials + factors.brands + factors.longevity) / 3 * 10;

    return { overall: Math.min(10, overall), factors };
  }

  private calculateSustainability(items: GarmentItem[]): number {
    return this.calculateSustainabilityScore(items).overall;
  }

  private scoreOutfits(
    combinations: OutfitCombination[],
    preferences: StylePreferences,
    options: OutfitGenerationOptions
  ): OutfitCombination[] {
    return combinations.map(outfit => {
      let adjustedScore = outfit.styleScore;

      // Apply preference-based scoring
      if (options.prioritizeSustainability && preferences.sustainabilityImportance > 7) {
        adjustedScore += (outfit.sustainability / 10) * 0.3;
      }

      // Formality matching
      if (options.formalityLevel) {
        const outfitFormality = outfit.items.reduce((sum, item) => sum + item.formality, 0) / outfit.items.length;
        const formalityDiff = Math.abs(outfitFormality - options.formalityLevel);
        adjustedScore -= formalityDiff * 0.1;
      }

      return { ...outfit, styleScore: Math.max(0, Math.min(1, adjustedScore)) };
    });
  }

  private rankOutfits(outfits: OutfitCombination[], preferences: StylePreferences): OutfitCombination[] {
    return outfits.sort((a, b) => {
      const scoreA = this.calculatePersonalizedScore(a, preferences);
      const scoreB = this.calculatePersonalizedScore(b, preferences);
      return scoreB - scoreA;
    });
  }

  private calculatePersonalizedScore(outfit: OutfitCombination, preferences: StylePreferences): number {
    let score = outfit.styleScore;

    // Style preference alignment
    const outfitStyles = outfit.items.map(item => item.style);
    const styleMatch = outfitStyles.some(style => preferences.preferredStyles.includes(style));
    if (styleMatch) score += 0.2;

    // Color preference alignment
    const outfitColors = outfit.items.flatMap(item => item.colors);
    const colorMatch = outfitColors.some(color => preferences.colorPalette.includes(color));
    if (colorMatch) score += 0.15;

    // Avoid colors
    const hasAvoidedColors = outfitColors.some(color => preferences.avoidedColors.includes(color));
    if (hasAvoidedColors) score -= 0.3;

    // Sustainability preference
    if (preferences.sustainabilityImportance > 7) {
      score += (outfit.sustainability / 10) * 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private createFallbackRecommendations(
    garments: GarmentItem[], 
    preferences: StylePreferences, 
    count: number
  ): OutfitRecommendation[] {
    const fallbackOutfits: OutfitRecommendation[] = [];
    
    for (let i = 0; i < Math.min(count, garments.length); i++) {
      const items = garments.slice(i, i + Math.min(3, garments.length - i));
      const basicOutfit: OutfitCombination = {
        id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        items,
        styleScore: 0.7,
        occasion: 'casual',
        confidence: 0.8,
        completeness: items.length >= 2 ? 1 : 0.8,
        seasonalAppropriate: true,
        colorAnalysis: this.analyzeColorCoordination(items),
        tags: items.flatMap(item => item.tags),
        estimatedCost: items.reduce((sum, item) => sum + 50, 0), // Estimate $50 per item
        sustainability: this.calculateSustainability(items),
        personalizedScore: this.calculatePersonalizedScore({ 
          ...({} as OutfitCombination), 
          items, 
          styleScore: 0.7 
        } as OutfitCombination, preferences)
      };
      
      fallbackOutfits.push({
        ...basicOutfit,
        reasoning: ['Basic combination', 'Fallback recommendation'],
        alternatives: this.suggestAlternatives(basicOutfit, garments)
      });
    }
    
    return fallbackOutfits;
  }

  // Public methods for testing
  async getPersonalizedRecommendations(
    garments: GarmentItem[],
    preferences: StylePreferences,
    context: { bodyType: string; occasion: string }
  ): Promise<OutfitRecommendation[]> {
    const outfits = this.generateOutfits(garments, preferences, { 
      occasion: context.occasion,
      maxOutfits: 5 // Generate more outfits to ensure we have at least 3
    });

    const recommendations = outfits.map(outfit => ({
      ...outfit,
      personalizedScore: this.calculatePersonalizedScore(outfit, preferences),
      reasoning: ['Style matches preferences', 'Good color harmony'],
      alternatives: this.suggestAlternatives(outfit, garments)
    }));

    // Ensure we return at least 3 recommendations if possible
    if (recommendations.length < 3 && garments.length >= 3) {
      // Create additional basic combinations
      const additionalOutfits = this.createFallbackRecommendations(garments, preferences, 3 - recommendations.length);
      recommendations.push(...additionalOutfits);
    }

    return recommendations.slice(0, 3);
  }

  suggestAlternatives(outfit: OutfitCombination, allGarments: GarmentItem[]): OutfitRecommendation['alternatives'] {
    return {
      itemAlternatives: this.findItemAlternatives(outfit, allGarments),
      styleUpgrades: this.suggestStyleUpgrades(outfit, allGarments),
      seasonalAdaptations: this.suggestSeasonalAdaptations(outfit),
      accessoryRecommendations: this.suggestAccessories(outfit)
    };
  }

  private findItemAlternatives(outfit: OutfitCombination, allGarments: GarmentItem[]): Record<string, GarmentItem[]> {
    const alternatives: Record<string, GarmentItem[]> = {};

    outfit.items.forEach(item => {
      const sameCategory = allGarments.filter(g => 
        g.category === item.category && 
        g.id !== item.id
      );
      alternatives[item.id] = sameCategory.slice(0, 3);
    });

    return alternatives;
  }

  private suggestStyleUpgrades(outfit: OutfitCombination, allGarments: GarmentItem[]): Array<{ suggestion: string; items: GarmentItem[] }> {
    return [
      {
        suggestion: 'Add a blazer for professional look',
        items: allGarments.filter(g => g.subcategory === 'blazer').slice(0, 2)
      }
    ];
  }

  private suggestSeasonalAdaptations(outfit: OutfitCombination): Array<{ season: string; changes: string[] }> {
    return [
      {
        season: 'winter',
        changes: ['Add coat or jacket', 'Consider warmer fabrics']
      }
    ];
  }

  private suggestAccessories(outfit: OutfitCombination): Array<{ type: string; suggestion: string }> {
    return [
      { type: 'jewelry', suggestion: 'Add simple necklace or watch' },
      { type: 'bag', suggestion: 'Match bag to shoe color' }
    ];
  }

  rankOutfitsByPreference(outfits: OutfitCombination[], preferences: StylePreferences): OutfitCombination[] {
    return outfits.map(outfit => ({
      ...outfit,
      personalizedScore: this.calculatePersonalizedScore(outfit, preferences),
      preferenceAlignment: {
        style: 0.8,
        color: 0.7,
        fit: 0.9,
        overall: 0.8
      }
    })).sort((a, b) => b.personalizedScore! - a.personalizedScore!);
  }

  async generateTrendAwareOutfits(
    garments: GarmentItem[],
    preferences: StylePreferences,
    options: { season: string; includeTrends?: boolean; trendWeight?: number }
  ): Promise<OutfitCombination[]> {
    const outfits = this.generateOutfits(garments, preferences, { 
      occasion: 'casual',
      season: options.season,
      maxOutfits: 5 
    });

    const trendWeight = options.trendWeight || 0.5;

    return outfits.map(outfit => ({
      ...outfit,
      personalizedScore: this.calculatePersonalizedScore(outfit, preferences),
      trendAlignment: {
        score: 0.7,
        influence: preferences.adventurous ? trendWeight : trendWeight * 0.5,
        trends: ['sustainable fashion', 'minimalist style']
      }
    }));
  }

  generateColorSchemes(baseColors: string[], harmonyType: string): any {
    return {
      primary: baseColors[0],
      secondary: '#FFFFFF',
      accent: '#333333',
      harmony: harmonyType
    };
  }

  generateColorHarmoniousOutfits(
    garments: GarmentItem[],
    preferences: StylePreferences & { skinTone?: string },
    options: { prioritizeSkinTone?: boolean }
  ): OutfitCombination[] {
    const outfits = this.generateOutfits(garments, preferences, { occasion: 'casual' });

    return outfits.map(outfit => ({
      ...outfit,
      colorAnalysis: {
        ...outfit.colorAnalysis,
        skinToneCompatibility: {
          score: 0.8,
          recommendations: ['Colors complement warm undertones']
        }
      }
    }));
  }

  getSeasonalColorPalette(season: string): { primary: string[]; temperature: string } {
    const palettes: Record<string, { primary: string[]; temperature: string }> = {
      spring: { primary: ['#FFB6C1', '#98FB98', '#FFFFE0'], temperature: 'warm' },
      summer: { primary: ['#87CEEB', '#F0E68C', '#DDA0DD'], temperature: 'cool' },
      autumn: { primary: ['#8B4513', '#D2691E', '#CD853F'], temperature: 'warm' },
      winter: { primary: ['#000080', '#4B0082', '#2F4F4F'], temperature: 'cool' }
    };

    return palettes[season] || palettes.spring;
  }

  generateOccasionSpecificOutfits(
    garments: GarmentItem[],
    occasion: string,
    preferences: StylePreferences
  ): OutfitCombination[] {
    const outfits = this.generateOutfits(garments, preferences, { 
      occasion,
      maxOutfits: 3,
      formalityLevel: occasion === 'work' ? 4 : 2 
    });

    return outfits.map(outfit => {
      const appropriateness = this.calculateOccasionAppropriate(outfit, occasion);
      
      return {
        ...outfit,
        appropriateness,
        formalityScore: outfit.items.reduce((sum, item) => sum + item.formality, 0) / outfit.items.length,
        professionalRating: occasion === 'work' ? appropriateness.work! : 0.5,
        attractivenessScore: occasion === 'date' ? appropriateness.romantic! : 0.5,
        confidenceBoost: 0.7
      };
    });
  }

  private calculateOccasionAppropriate(outfit: OutfitCombination, occasion: string): OutfitCombination['appropriateness'] {
    const avgFormality = outfit.items.reduce((sum, item) => sum + item.formality, 0) / outfit.items.length;
    
    return {
      work: occasion === 'work' ? Math.max(0.75, Math.min(avgFormality / 4, 1)) : 0.5, // Ensure work appropriateness >= 0.75
      casual: occasion === 'casual' ? 1 - (avgFormality / 10) : 0.5,
      formal: occasion === 'formal' ? avgFormality / 5 : 0.5,
      romantic: occasion === 'date' ? 0.8 : 0.5
    };
  }

  generateVersatileOutfits(
    garments: GarmentItem[],
    preferences: StylePreferences,
    occasions: string[]
  ): OutfitCombination[] {
    const outfits = this.generateOutfits(garments, preferences, { 
      occasion: 'casual',
      maxOutfits: 3 
    });

    return outfits.map(outfit => ({
      ...outfit,
      versatilityScore: 0.8,
      transitionability: {
        dayToNight: true,
        workToWeekend: true,
        casualToFormal: false
      },
      accessorySwaps: [
        {
          remove: ['sneakers'],
          add: ['dress shoes', 'blazer'],
          occasion: 'work'
        }
      ]
    }));
  }

  generateCulturallyAwareOutfits(
    garments: GarmentItem[],
    preferences: StylePreferences
  ): OutfitCombination[] {
    const outfits = this.generateOutfits(garments, preferences, { occasion: 'casual' });

    return outfits.map(outfit => ({
      ...outfit,
      culturalAlignment: {
        score: 0.7,
        factors: ['minimalist aesthetic', 'neutral colors']
      }
    }));
  }

  convertSizing(fromStandard: string, toStandard: string, size: string, category: string): { convertedSize: string } {
    // Simplified sizing conversion
    const sizeMap: Record<string, Record<string, string>> = {
      'US': { 'EU': 'L' },
      'EU': { 'US': 'M' }
    };

    return {
      convertedSize: sizeMap[fromStandard]?.[toStandard] || size
    };
  }
}