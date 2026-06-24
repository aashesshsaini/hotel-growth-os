import { PricingBreakdown, PricingPreviewInput } from './roomType.types';

export const getEffectiveRoomTypePrice = (
  basePrice: number,
  weekdayPrice?: number,
  weekendPrice?: number,
  isWeekend = false
): number => {
  if (isWeekend && weekendPrice !== undefined && weekendPrice >= 0) {
    return weekendPrice;
  }
  if (!isWeekend && weekdayPrice !== undefined && weekdayPrice >= 0) {
    return weekdayPrice;
  }
  return basePrice;
};

export const calculateWeekdayWeekendPrice = (
  basePrice: number,
  weekdayPrice?: number,
  weekendPrice?: number,
  isWeekend = false
): number => {
  return getEffectiveRoomTypePrice(basePrice, weekdayPrice, weekendPrice, isWeekend);
};

export const calculateDiscountAmount = (price: number, discountPercentage = 0): number => {
  if (discountPercentage <= 0) return 0;
  return Math.round((price * discountPercentage) / 100);
};

export const calculateTaxAmount = (priceAfterDiscount: number, taxPercentage = 0): number => {
  if (taxPercentage <= 0) return 0;
  return Math.round((priceAfterDiscount * taxPercentage) / 100);
};

export const calculateFinalPrice = (input: PricingPreviewInput): PricingBreakdown => {
  const effectivePrice = calculateWeekdayWeekendPrice(
    input.basePrice,
    input.weekdayPrice,
    input.weekendPrice,
    input.isWeekend
  );

  const discountAmount = calculateDiscountAmount(effectivePrice, input.discountPercentage ?? 0);
  const priceAfterDiscount = effectivePrice - discountAmount;
  const taxAmount = calculateTaxAmount(priceAfterDiscount, input.taxPercentage ?? 0);
  const extraAdults = input.extraAdults ?? 0;
  const extraChildren = input.extraChildren ?? 0;
  const extraGuestCharges =
    extraAdults * (input.extraAdultPrice ?? 0) + extraChildren * (input.extraChildPrice ?? 0);
  const finalPrice = priceAfterDiscount + taxAmount + extraGuestCharges;

  return {
    basePrice: input.basePrice,
    effectivePrice,
    discountAmount,
    taxAmount,
    extraGuestCharges,
    finalPrice,
    weekdayPrice: input.weekdayPrice,
    weekendPrice: input.weekendPrice,
  };
};
