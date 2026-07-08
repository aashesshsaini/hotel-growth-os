'use client';

import { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import {
  confirmGoogleReviewSubmitted,
  getPublicSatisfactionPage,
  submitPrivateRating,
  submitPublicNegativeFeedback,
  trackGoogleReviewClick,
  type PublicSatisfactionPage,
  type PrivateRatingResult,
} from '@/services/reviewSatisfaction.service';

type Step = 'loading' | 'rating' | 'positive' | 'negative' | 'submitted' | 'error';

const categories = [
  { value: 'service', label: 'Service' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'staff', label: 'Staff' },
  { value: 'billing', label: 'Billing' },
  { value: 'amenities', label: 'Amenities' },
  { value: 'other', label: 'Other' },
];

function StarPicker({ value, onChange, disabled }: { value: number; onChange: (rating: number) => void; disabled?: boolean }) {
  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          aria-label={`Rate ${star} stars`}
          onClick={() => onChange(star)}
          className="rounded-full p-2 transition hover:scale-110 disabled:opacity-50"
        >
          <Star className={`h-10 w-10 sm:h-12 sm:w-12 ${value >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
        </button>
      ))}
    </div>
  );
}

export default function PublicSatisfactionPage({ params }: { params: { token: string } }) {
  const [step, setStep] = useState<Step>('loading');
  const [page, setPage] = useState<PublicSatisfactionPage | null>(null);
  const [result, setResult] = useState<PrivateRatingResult | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({ feedback: '', category: 'service', submitterName: '', submitterPhone: '', contactRequested: false });

  const load = useCallback(async () => {
    setStep('loading');
    setError('');
    try {
      const data = await getPublicSatisfactionPage(params.token);
      setPage(data);
      if (data.alreadyReviewed) {
        setStep('submitted');
      } else if (data.alreadyRated && data.satisfactionOutcome === 'positive') {
        setResult({ outcome: 'positive', rating: data.privateRating ?? 5, threshold: 4, googleReviewUrl: data.googleReviewUrl, message: "Thank you! We're glad you enjoyed your stay." });
        setStep('positive');
      } else if (data.alreadyRated && data.satisfactionOutcome === 'negative') {
        setSelectedRating(data.privateRating ?? 2);
        setStep('negative');
      } else {
        setStep('rating');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load review request');
      setStep('error');
    }
  }, [params.token]);

  useEffect(() => { void load(); }, [load]);

  const handleRating = async (rating: number) => {
    setSelectedRating(rating);
    setSubmitting(true);
    setError('');
    try {
      const response = await submitPrivateRating(params.token, rating);
      setResult(response);
      setStep(response.outcome === 'positive' ? 'positive' : 'negative');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    setSubmitting(true);
    setError('');
    try {
      const data = await trackGoogleReviewClick(params.token);
      window.open(data.googleReviewUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google review link unavailable');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReview = async () => {
    setSubmitting(true);
    setError('');
    try {
      await confirmGoogleReviewSubmitted(params.token);
      setStep('submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!feedbackForm.feedback.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await submitPublicNegativeFeedback(params.token, {
        rating: selectedRating,
        feedback: feedbackForm.feedback,
        category: feedbackForm.category,
        submitterName: feedbackForm.submitterName || undefined,
        submitterPhone: feedbackForm.submitterPhone || undefined,
        contactRequested: feedbackForm.contactRequested,
      });
      setStep('submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-lg">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 text-slate-950 shadow-2xl">
          <div className="bg-slate-950 px-6 py-8 text-center text-white">
            {page?.hotelLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={page.hotelLogo} alt={page.hotelName} className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">
                {(page?.hotelName || 'H').slice(0, 1)}
              </div>
            )}
            <h1 className="text-2xl font-bold">{page?.hotelName || 'Your Hotel'}</h1>
            {page?.guestName && <p className="mt-2 text-sm text-slate-300">Hi {page.guestName}, thank you for staying with us.</p>}
          </div>

          <div className="px-6 py-8">
            {step === 'loading' && <p className="text-center text-slate-500">Loading your review experience...</p>}

            {step === 'error' && (
              <div className="rounded-2xl bg-rose-50 p-4 text-center text-rose-700">
                <p className="font-semibold">Review link unavailable</p>
                <p className="mt-2 text-sm">{error}</p>
              </div>
            )}

            {step === 'rating' && (
              <div className="space-y-6 text-center">
                <div>
                  <p className="text-lg font-semibold text-slate-950">How was your stay?</p>
                  <p className="mt-2 text-sm text-slate-500">Tap a star to share your private satisfaction rating.</p>
                </div>
                <StarPicker value={selectedRating} onChange={(rating) => void handleRating(rating)} disabled={submitting} />
                {submitting && <p className="text-sm text-slate-500">Submitting your rating...</p>}
              </div>
            )}

            {step === 'positive' && (
              <div className="space-y-6 text-center">
                <div>
                  <p className="text-xl font-bold text-slate-950">{result?.message || "Thank you! We're glad you enjoyed your stay."}</p>
                  <p className="mt-3 text-sm text-slate-600">Would you mind sharing your experience on Google?</p>
                </div>
                <button type="button" className="btn-primary w-full" disabled={submitting} onClick={() => void handleGoogleClick()}>
                  Leave a Google Review
                </button>
                <button type="button" className="btn-secondary w-full" disabled={submitting} onClick={() => void handleConfirmReview()}>
                  I have submitted my review
                </button>
              </div>
            )}

            {step === 'negative' && (
              <form className="space-y-5" onSubmit={(event) => void handleFeedbackSubmit(event)}>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-950">We&apos;re sorry your experience wasn&apos;t perfect.</p>
                  <p className="mt-2 text-sm text-slate-600">Please help us improve. Your feedback stays private with our team.</p>
                </div>
                <StarPicker value={selectedRating} onChange={setSelectedRating} disabled />
                <label className="block text-left text-sm font-semibold text-slate-700">
                  Feedback
                  <textarea
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    rows={4}
                    required
                    value={feedbackForm.feedback}
                    onChange={(e) => setFeedbackForm((prev) => ({ ...prev, feedback: e.target.value }))}
                    placeholder="Tell us what we can do better"
                  />
                </label>
                <label className="block text-left text-sm font-semibold text-slate-700">
                  Category
                  <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={feedbackForm.category} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, category: e.target.value }))}>
                    {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-left text-sm font-semibold text-slate-700">
                    Name (optional)
                    <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={feedbackForm.submitterName} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, submitterName: e.target.value }))} />
                  </label>
                  <label className="block text-left text-sm font-semibold text-slate-700">
                    Phone (optional)
                    <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" value={feedbackForm.submitterPhone} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, submitterPhone: e.target.value }))} />
                  </label>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={feedbackForm.contactRequested} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, contactRequested: e.target.checked }))} />
                  <span>Yes, please contact me about this issue.</span>
                </label>
                <button type="submit" className="btn-primary w-full" disabled={submitting}>Submit Feedback</button>
              </form>
            )}

            {step === 'submitted' && (
              <div className="space-y-4 text-center">
                <p className="text-xl font-bold text-slate-950">Thank you for your feedback.</p>
                <p className="text-sm text-slate-600">Our team has received your response and will use it to improve your next stay.</p>
              </div>
            )}

            {error && step !== 'error' && <p className="mt-4 text-center text-sm text-rose-600">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
