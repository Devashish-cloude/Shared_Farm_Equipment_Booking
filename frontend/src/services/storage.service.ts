import { supabase, isSupabaseConfigured, getSupabaseMissingError } from '../lib/supabase';

const BUCKET_NAME = 'equipment-images';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export interface UploadResult {
  url: string;
  path: string;
}

export const storageService = {
  /**
   * Upload an equipment image to Supabase Storage.
   * Validates file size, mime-type, and generates a unique user-scoped filepath.
   */
  async uploadEquipmentImage(file: File, userId: string): Promise<UploadResult> {
    if (!isSupabaseConfigured()) {
      throw new Error(getSupabaseMissingError());
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Invalid file format. Only JPEG, PNG, WebP, and AVIF images are permitted.');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('File size exceeds the 5 MB limit.');
    }

    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${Date.now()}_${cleanFilename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      path: filePath,
    };
  },

  /**
   * Delete an image from storage.
   */
  async deleteEquipmentImage(path: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
    if (error) {
      console.warn('Could not delete image from storage:', error.message);
    }
  },

  /**
   * Upload user profile avatar to Supabase Storage.
   * Validates file size (max 2MB), mime-type, and generates a user-scoped filepath.
   * Uploads to 'avatars' bucket with fallback to 'equipment-images' if needed.
   */
  async uploadAvatar(file: File, userId: string): Promise<UploadResult> {
    if (!isSupabaseConfigured()) {
      throw new Error(getSupabaseMissingError());
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Invalid file format. Only JPEG, PNG, WebP, and AVIF images are permitted.');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Avatar file size exceeds the 2 MB limit.');
    }

    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${Date.now()}_${cleanFilename}`;

    // Try 'avatars' bucket first
    let bucket = 'avatars';
    let { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    // Fallback to equipment-images if avatars bucket is not present
    if (uploadError && (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket'))) {
      bucket = BUCKET_NAME;
      const fallbackUpload = await supabase.storage
        .from(bucket)
        .upload(`avatars/${filePath}`, file, {
          cacheControl: '3600',
          upsert: true,
        });
      uploadError = fallbackUpload.error;
    }

    if (uploadError) {
      throw new Error(`Profile photo upload failed: ${uploadError.message}`);
    }

    const finalPath = bucket === 'avatars' ? filePath : `avatars/${filePath}`;
    const { data } = supabase.storage.from(bucket).getPublicUrl(finalPath);

    return {
      url: data.publicUrl,
      path: finalPath,
    };
  },

  async deleteAvatar(path: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    await supabase.storage.from('avatars').remove([path]);
  },
};
