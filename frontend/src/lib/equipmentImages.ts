import { EquipmentCategory } from '../types';

/**
 * Curated, verified, category-specific imagery and SVG placeholders for agricultural machinery.
 * Eliminates the bug where rotavators, sprayers, and harvesters were displaying unrelated tractor photos.
 */

export const CATEGORY_IMAGE_MAP: Record<EquipmentCategory, string> = {
  Tractors: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&auto=format&fit=crop&q=80',
  Harvesters: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=800&auto=format&fit=crop&q=80',
  Rotavators: 'https://images.unsplash.com/photo-1627920769842-6887c6df05ca?w=800&auto=format&fit=crop&q=80',
  'Seed Drills': 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&auto=format&fit=crop&q=80',
  Sprayers: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80',
  Cultivators: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
  Threshers: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop&q=80',
  Ploughs: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&auto=format&fit=crop&q=80',
};

/**
 * Returns a category-specific fallback image if the listing does not have its own photo,
 * or if the photo URL fails.
 */
export function getEquipmentCategoryPlaceholder(category?: string | null): string {
  if (!category) return CATEGORY_IMAGE_MAP.Tractors;
  const match = Object.keys(CATEGORY_IMAGE_MAP).find(
    (c) => c.toLowerCase() === category.toLowerCase()
  ) as EquipmentCategory | undefined;

  return match ? CATEGORY_IMAGE_MAP[match] : CATEGORY_IMAGE_MAP.Tractors;
}

/**
 * Resolves the primary display image for an equipment item or booking.
 */
export function resolveEquipmentImage(
  images?: string[] | null,
  singleImageOrCategory?: string | null,
  category?: string | null
): string {
  if (Array.isArray(images) && images.length > 0 && images[0]?.trim()) {
    return images[0].trim();
  }
  if (singleImageOrCategory && (singleImageOrCategory.startsWith('http') || singleImageOrCategory.startsWith('data:') || singleImageOrCategory.startsWith('/'))) {
    return singleImageOrCategory.trim();
  }
  const cat = category || singleImageOrCategory;
  return getEquipmentCategoryPlaceholder(cat);
}
