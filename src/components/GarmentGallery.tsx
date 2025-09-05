'use client';

import React, { useState } from 'react';

export interface Garment {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
}

interface GarmentGalleryProps {
  garments: Garment[];
  loading?: boolean;
  selectedId?: string;
  onSelect?: (garment: Garment) => void;
}

const GarmentGallery: React.FC<GarmentGalleryProps> = ({
  garments,
  loading = false,
  selectedId,
  onSelect,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(garments.map(g => g.category)))];

  const filteredGarments = activeFilter === 'all'
    ? garments
    : garments.filter(g => g.category === activeFilter);

  if (loading) {
    return (
      <div className="garment-gallery p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Choose Your Outfit</h2>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading outfits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="garment-gallery p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Choose Your Outfit</h2>

      {garments.length > 0 && (
        <div className="mb-4 flex gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-4 py-2 rounded transition-colors ${
                activeFilter === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      )}

      {filteredGarments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {garments.length === 0 ? 'No outfits available' : 'No outfits in this category'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGarments.map(garment => (
            <button
              key={garment.id}
              onClick={() => onSelect?.(garment)}
              className="group relative"
            >
              <div
                className={`border-2 rounded-lg overflow-hidden transition-all ${
                  selectedId === garment.id
                    ? 'selected border-blue-500 shadow-lg'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img
                  src={garment.imageUrl}
                  alt={garment.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-2 bg-white">
                  <p className="text-sm font-medium text-gray-900">{garment.name}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GarmentGallery;