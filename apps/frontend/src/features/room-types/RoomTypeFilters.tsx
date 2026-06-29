'use client';

import { SelectInput } from '@/components/FormInput';
import { FilterPanel } from '@/components/layout';
import {
  BED_TYPES,
  INVENTORY_TYPES,
  MEAL_PLANS,
  ROOM_TYPE_STATUSES,
} from './constants';

interface RoomTypeFiltersProps {
  statusFilter: string;
  bedTypeFilter: string;
  mealPlanFilter: string;
  inventoryTypeFilter: string;
  websiteFilter: string;
  bookingFilter: string;
  minPrice: string;
  maxPrice: string;
  minGuests: string;
  maxGuests: string;
  onStatusChange: (value: string) => void;
  onBedTypeChange: (value: string) => void;
  onMealPlanChange: (value: string) => void;
  onInventoryTypeChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
  onBookingChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onMinGuestsChange: (value: string) => void;
  onMaxGuestsChange: (value: string) => void;
  onReset: () => void;
}

export const RoomTypeFilters = ({
  statusFilter,
  bedTypeFilter,
  mealPlanFilter,
  inventoryTypeFilter,
  websiteFilter,
  bookingFilter,
  minPrice,
  maxPrice,
  minGuests,
  maxGuests,
  onStatusChange,
  onBedTypeChange,
  onMealPlanChange,
  onInventoryTypeChange,
  onWebsiteChange,
  onBookingChange,
  onMinPriceChange,
  onMaxPriceChange,
  onMinGuestsChange,
  onMaxGuestsChange,
  onReset,
}: RoomTypeFiltersProps) => {
  const activeCount = [
    statusFilter,
    bedTypeFilter,
    mealPlanFilter,
    inventoryTypeFilter,
    websiteFilter,
    bookingFilter,
    minPrice,
    maxPrice,
    minGuests,
    maxGuests,
  ].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <FilterPanel
        title="More Filters"
        activeCount={activeCount}
        onReset={onReset}
        basicFilters={
          <>
            <div className="filter-field">
              <SelectInput
                label="Status"
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                options={[{ value: '', label: 'All statuses' }, ...ROOM_TYPE_STATUSES]}
              />
            </div>
            <div className="filter-field">
              <SelectInput
                label="Bed Type"
                value={bedTypeFilter}
                onChange={(e) => onBedTypeChange(e.target.value)}
                options={[{ value: '', label: 'All bed types' }, ...BED_TYPES]}
              />
            </div>
          </>
        }
      >
        <SelectInput
          label="Meal Plan"
          value={mealPlanFilter}
          onChange={(e) => onMealPlanChange(e.target.value)}
          options={[{ value: '', label: 'All meal plans' }, ...MEAL_PLANS]}
        />
        <SelectInput
          label="Inventory Type"
          value={inventoryTypeFilter}
          onChange={(e) => onInventoryTypeChange(e.target.value)}
          options={[{ value: '', label: 'All inventory types' }, ...INVENTORY_TYPES]}
        />
        <SelectInput
          label="Website Visible"
          value={websiteFilter}
          onChange={(e) => onWebsiteChange(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'true', label: 'Visible' },
            { value: 'false', label: 'Hidden' },
          ]}
        />
        <SelectInput
          label="Booking Available"
          value={bookingFilter}
          onChange={(e) => onBookingChange(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'true', label: 'Available' },
            { value: 'false', label: 'Unavailable' },
          ]}
        />
        <SelectInput
          label="Min Price (₹)"
          value={minPrice}
          onChange={(e) => onMinPriceChange(e.target.value)}
          options={[
            { value: '', label: 'Any' },
            ...[1000, 2000, 3000, 5000, 7500, 10000].map((p) => ({
              value: String(p),
              label: `${p.toLocaleString('en-IN')}+`,
            })),
          ]}
        />
        <SelectInput
          label="Max Price (₹)"
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(e.target.value)}
          options={[
            { value: '', label: 'Any' },
            ...[3000, 5000, 7500, 10000, 15000, 20000].map((p) => ({
              value: String(p),
              label: `Up to ${p.toLocaleString('en-IN')}`,
            })),
          ]}
        />
        <SelectInput
          label="Min Guests"
          value={minGuests}
          onChange={(e) => onMinGuestsChange(e.target.value)}
          options={[
            { value: '', label: 'Any' },
            ...[1, 2, 3, 4, 5].map((g) => ({ value: String(g), label: `${g}+` })),
          ]}
        />
        <SelectInput
          label="Max Guests"
          value={maxGuests}
          onChange={(e) => onMaxGuestsChange(e.target.value)}
          options={[
            { value: '', label: 'Any' },
            ...[2, 3, 4, 5, 6].map((g) => ({ value: String(g), label: `Up to ${g}` })),
          ]}
        />
      </FilterPanel>
    </div>
  );
};
