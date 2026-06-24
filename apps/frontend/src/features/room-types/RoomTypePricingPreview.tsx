'use client';

import type { RoomTypeFormData } from '@/types';
import { formatCurrency } from '@/utils/format';

interface RoomTypePricingPreviewProps {
  form: Pick<
    RoomTypeFormData,
    | 'basePrice'
    | 'weekdayPrice'
    | 'weekendPrice'
    | 'taxPercentage'
    | 'discountPercentage'
    | 'extraAdultPrice'
    | 'extraChildPrice'
  >;
}

const calcPreview = (form: RoomTypePricingPreviewProps['form'], isWeekend = false) => {
  const base = form.basePrice || 0;
  const effective =
    isWeekend && form.weekendPrice !== undefined && form.weekendPrice >= 0
      ? form.weekendPrice
      : !isWeekend && form.weekdayPrice !== undefined && form.weekdayPrice >= 0
        ? form.weekdayPrice
        : base;
  const discount = Math.round((effective * (form.discountPercentage || 0)) / 100);
  const afterDiscount = effective - discount;
  const tax = Math.round((afterDiscount * (form.taxPercentage || 0)) / 100);
  return { effective, discount, tax, final: afterDiscount + tax };
};

export const RoomTypePricingPreview = ({ form }: RoomTypePricingPreviewProps) => {
  const weekday = calcPreview(form, false);
  const weekend = calcPreview(form, true);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">Pricing Preview</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 text-sm">
          <p className="font-medium text-slate-700">Weekday</p>
          <div className="flex justify-between"><span>Base / Effective</span><span>{formatCurrency(weekday.effective)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(weekday.discount)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>+{formatCurrency(weekday.tax)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold"><span>Final</span><span>{formatCurrency(weekday.final)}</span></div>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-slate-700">Weekend</p>
          <div className="flex justify-between"><span>Base / Effective</span><span>{formatCurrency(weekend.effective)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(weekend.discount)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>+{formatCurrency(weekend.tax)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold"><span>Final</span><span>{formatCurrency(weekend.final)}</span></div>
        </div>
      </div>
      {(form.extraAdultPrice || form.extraChildPrice) ? (
        <p className="mt-3 text-xs text-slate-500">
          Extra adult: {formatCurrency(form.extraAdultPrice || 0)} · Extra child: {formatCurrency(form.extraChildPrice || 0)}
        </p>
      ) : null}
    </div>
  );
};
