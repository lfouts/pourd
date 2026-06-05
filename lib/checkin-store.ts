import { Wine, Venue } from '@/types/database';

export interface CheckinDraft {
  wine: Wine | null;
  venue: Venue | null;
  rating: number;
  description: string;
  guessedNotes: string[];
  servingStyle: 'glass' | 'bottle' | 'tasting' | null;
  isPublic: boolean;
}

let draft: CheckinDraft = makeEmpty();

function makeEmpty(): CheckinDraft {
  return {
    wine: null,
    venue: null,
    rating: 0,
    description: '',
    guessedNotes: [],
    servingStyle: null,
    isPublic: true,
  };
}

export const checkinStore = {
  get: () => draft,
  set: (patch: Partial<CheckinDraft>) => { draft = { ...draft, ...patch }; },
  reset: () => { draft = makeEmpty(); },
};
