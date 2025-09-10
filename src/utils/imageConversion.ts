import heic2any from 'heic2any';

/**
 * Convert HEIC/HEIF images to JPEG format
 * @param file - The file to convert
 * @returns Promise with converted file or original if not HEIC
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  // Check if file is HEIC/HEIF format
  const isHeic = file.type === 'image/heic' || 
                 file.type === 'image/heif' || 
                 file.name.toLowerCase().endsWith('.heic') ||
                 file.name.toLowerCase().endsWith('.heif');
  
  if (!isHeic) {
    return file; // Return original file if not HEIC
  }

  try {
    console.log('Converting HEIC image to JPEG...');
    
    // Convert HEIC to JPEG blob
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9
    }) as Blob;
    
    // Create new File object with converted data
    const convertedFile = new File(
      [convertedBlob], 
      file.name.replace(/\.(heic|heif)$/i, '.jpg'),
      { type: 'image/jpeg' }
    );
    
    console.log('HEIC conversion successful');
    return convertedFile;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    // If conversion fails, return original file
    // The user will see an error but can try with a different format
    return file;
  }
}

/**
 * Process image file for upload
 * - Converts HEIC to JPEG if needed
 * - Validates image type
 * @param file - The file to process
 * @returns Promise with processed file
 */
export async function processImageForUpload(file: File): Promise<File> {
  // Convert HEIC if needed
  const processedFile = await convertHeicToJpeg(file);
  
  // Validate it's an image
  if (!processedFile.type.startsWith('image/')) {
    throw new Error('Please upload an image file');
  }
  
  return processedFile;
}