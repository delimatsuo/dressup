'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, X, ShoppingBag, Camera, Link, Smartphone } from 'lucide-react';
import { useSession } from '../hooks/useSession';

interface GarmentUploadProps {
  onComplete: (photos: { front: string | null; side: string | null; back: string | null }) => void;
  title?: string;
  description?: string;
}

export const GarmentUpload: React.FC<GarmentUploadProps> = ({
  onComplete,
  title = "Upload Garment",
  description = "Upload a garment from an online store"
}) => {
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useSession();
  const sessionId = session?.sessionId || `temp-${Date.now()}`;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Create local preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setGarmentImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // TODO: Migrate to Vercel Blob API
      // Upload functionality temporarily disabled during Firebase to Blob migration
      console.warn('Upload functionality disabled - needs Blob API integration');

      // TODO: Replace with Blob API upload
      /* 
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error('Upload error:', error);
          setError('Failed to upload image. Please try again.');
          setUploading(false);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setGarmentImage(downloadUrl);
          setUploading(false);
        }
      );
      */
      
      // Temporary: Just set the image from file reader for preview
      setUploading(false);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload image. Please try again.');
      setUploading(false);
    }
  }, [sessionId]);

  const handleRemove = useCallback(() => {
    setGarmentImage(null);
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleComplete = useCallback(() => {
    if (garmentImage) {
      // For garments, we only need one image (front view)
      // We'll use the same image for all views since it's a product photo
      onComplete({
        front: garmentImage,
        side: garmentImage,
        back: garmentImage
      });
    }
  }, [garmentImage, onComplete]);

  return (
    <div className="w-full space-y-6">
      {/* Title and Instructions */}
      <div className="text-center space-y-3">
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-3">
        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          How to upload from your phone:
        </h4>
        <ol className="text-sm text-blue-800 space-y-2 ml-7">
          <li>1. Find the garment on any shopping website</li>
          <li>2. Take a screenshot (press Power + Volume Down)</li>
          <li>3. Tap the upload button below</li>
          <li>4. Select the screenshot from your gallery</li>
        </ol>
      </div>

      {/* Alternative Options */}
      <div className="grid grid-cols-2 gap-3">
        <button
          className="p-3 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition-colors"
          onClick={() => {
            // Future feature: URL input
            alert('Coming soon: Paste a product URL directly!');
          }}
        >
          <Link className="w-6 h-6 mx-auto mb-2 text-gray-600" />
          <span className="text-sm text-gray-700">Paste URL</span>
          <span className="text-xs text-gray-500 block">Coming Soon</span>
        </button>
        
        <button
          className="p-3 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="w-6 h-6 mx-auto mb-2 text-gray-600" />
          <span className="text-sm text-gray-700">From Gallery</span>
          <span className="text-xs text-gray-500 block">Screenshots & Photos</span>
        </button>
      </div>

      {/* Main Upload Area */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="garment-upload"
        />
        
        {!garmentImage ? (
          <label
            htmlFor="garment-upload"
            className="
              block w-full aspect-[4/3]
              bg-gradient-to-br from-purple-50 to-blue-50
              border-2 border-dashed border-purple-300
              rounded-2xl
              flex flex-col items-center justify-center
              cursor-pointer
              hover:border-purple-400 hover:bg-purple-50
              transition-all
              relative overflow-hidden
            "
          >
            {uploading ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                  <div 
                    className="absolute inset-0 border-4 border-purple-500 rounded-full animate-spin"
                    style={{
                      borderTopColor: 'transparent',
                      borderRightColor: 'transparent',
                    }}
                  ></div>
                </div>
                <p className="text-gray-600 font-medium">Uploading...</p>
                <p className="text-sm text-gray-500 mt-1">{uploadProgress}%</p>
              </div>
            ) : (
              <>
                <ShoppingBag className="w-16 h-16 text-purple-400 mb-4" />
                <span className="text-lg font-medium text-gray-700">
                  Tap to upload garment
                </span>
                <span className="text-sm text-gray-500 mt-2">
                  Screenshots or product photos
                </span>
                <span className="text-xs text-gray-400 mt-4 px-4 text-center">
                  Supports JPG, PNG, HEIC • Max 10MB
                </span>
              </>
            )}
          </label>
        ) : (
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-lg">
              <img
                src={garmentImage}
                alt="Uploaded garment"
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="
                absolute top-3 right-3
                p-2 bg-red-500 text-white rounded-full
                shadow-lg hover:bg-red-600
                transition-all
              "
              aria-label="Remove garment image"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image info */}
            <div className="absolute bottom-3 left-3 right-3">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
                <p className="text-sm font-medium text-gray-700">Garment uploaded</p>
                <p className="text-xs text-gray-500">Ready for virtual try-on</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Continue Button */}
      {garmentImage && !uploading && (
        <button
          onClick={handleComplete}
          className="
            w-full py-4 px-6
            bg-gradient-to-r from-purple-500 to-blue-500
            text-white font-semibold text-lg
            rounded-xl shadow-lg
            hover:shadow-xl hover:scale-[1.02]
            transition-all
            flex items-center justify-center gap-2
          "
        >
          Continue to Generate Outfit
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Popular Stores Suggestion */}
      <div className="text-center py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Works with screenshots from:</p>
        <div className="flex justify-center gap-4 flex-wrap">
          {['Zara', 'H&M', 'ASOS', 'Shein', 'Amazon', 'Any Store'].map((store) => (
            <span key={store} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
              {store}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};