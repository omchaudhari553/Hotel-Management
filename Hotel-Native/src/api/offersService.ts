import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfferItem {
  id: string;
  code: string;
  name: string;
  desc: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  validFrom: string;
  validTo: string;
  status: 'ACTIVE' | 'INACTIVE';
  isCustom?: boolean;
}

export const INITIAL_OFFERS: OfferItem[] = [
  {
    id: 'off-1',
    code: 'NAV2026',
    name: 'Navratri Festive Special',
    desc: '20% discount offer on all dine-in and parcel orders.',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    validFrom: '2026-10-13',
    validTo: '2026-11-12',
    status: 'ACTIVE',
  },
  {
    id: 'off-2',
    code: 'WEEKEND10',
    name: 'Weekend Family Feast',
    desc: 'Flat 10% discount on all family table bills above ₹999.',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    validFrom: '2026-10-01',
    validTo: '2026-12-31',
    status: 'ACTIVE',
  },
  {
    id: 'off-3',
    code: 'WELCOME100',
    name: 'First Order Special',
    desc: 'Get ₹100 flat discount on first online delivery order above ₹499.',
    discountType: 'FIXED',
    discountValue: 100,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    status: 'ACTIVE',
  },
];

const STORAGE_KEY = '@HOTEL_ACTIVE_OFFERS_V1';

export const getSavedOffers = async (): Promise<OfferItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading saved offers:', e);
  }
  return INITIAL_OFFERS;
};

export const saveOffersToStorage = async (offers: OfferItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  } catch (e) {
    console.warn('Error saving offers:', e);
  }
};
