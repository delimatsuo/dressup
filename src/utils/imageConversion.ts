/**
 * Process HEIC/HEIF images for upload
 * No client-side conversion - server will handle HEIC processing
 * @param file - The file to process
 * @returns Promise with original file (server handles conversion)
 */
export async function processHeicFile(file: File): Promise<File> {
  // Check if file is HEIC/HEIF format
  const isHeic = file.type === 'image/heic' || 
                 file.type === 'image/heif' || 
                 file.name.toLowerCase().endsWith('.heic') ||
                 file.name.toLowerCase().endsWith('.heif');
  
  if (!isHeic) {
    return file; // Return original file if not HEIC
  }

  console.log('HEIC file detected - will be processed on server');
  
  // Ensure proper MIME type for HEIC files
  const processedFile = new File([file], file.name, { 
    type: file.type || 'image/heic',
    lastModified: file.lastModified 
  });
  
  return processedFile;
}

/**
 * Process image file for upload
 * - Accepts all image formats including HEIC
 * - Server handles any necessary conversions
 * @param file - The file to process
 * @returns Promise with processed file
 */
export async function processImageForUpload(file: File): Promise<File> {
  // Process HEIC files (no client-side conversion)
  const processedFile = await processHeicFile(file);
  
  // Validate it's an image file
  const isValidImage = processedFile.type.startsWith('image/') || 
                      processedFile.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/);
  
  if (!isValidImage) {
    throw new Error('Please upload an image file');
  }
  
  return processedFile;
}