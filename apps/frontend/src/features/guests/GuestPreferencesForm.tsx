'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
import { FOOD_PREFERENCES } from './constants';

interface GuestPreferencesFormProps {
  preferences: string[];
  foodPreference: string;
  roomPreference: string;
  specialRequests: string;
  onChange: (data: {
    preferences: string[];
    foodPreference: string;
    roomPreference: string;
    specialRequests: string;
  }) => void;
}

export const GuestPreferencesForm = ({
  preferences,
  foodPreference,
  roomPreference,
  specialRequests,
  onChange,
}: GuestPreferencesFormProps) => (
  <div className="space-y-4">
    <FormInput
      label="Preferences"
      value={preferences.join(', ')}
      onChange={(e) =>
        onChange({
          preferences: e.target.value.split(',').map((p) => p.trim()).filter(Boolean),
          foodPreference,
          roomPreference,
          specialRequests,
        })
      }
      placeholder="early check-in, quiet room"
    />
    <SelectInput
      label="Food Preference"
      value={foodPreference}
      onChange={(e) =>
        onChange({ preferences, foodPreference: e.target.value, roomPreference, specialRequests })
      }
      options={FOOD_PREFERENCES}
    />
    <FormInput
      label="Room Preference"
      value={roomPreference}
      onChange={(e) =>
        onChange({ preferences, foodPreference, roomPreference: e.target.value, specialRequests })
      }
    />
    <FormInput
      label="Special Requests"
      value={specialRequests}
      onChange={(e) =>
        onChange({ preferences, foodPreference, roomPreference, specialRequests: e.target.value })
      }
    />
  </div>
);
