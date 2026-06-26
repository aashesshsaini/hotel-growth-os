'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Eye,
  LayoutGrid,
  LayoutList,
  MessageSquare,
  RefreshCw,
  Send,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  DEPARTMENT_RATING_FIELDS,
  REVIEW_SOURCES,
  REVIEW_SOURCE_LABELS,
  REVIEW_STATUSES,
  REVIEW_STATUS_LABELS,
} from '@/features/reviews/constants';
import {
  addReviewNote,
  createReview,
  deleteReview,
  escalateReview,
  getReviewById,
  getReviewStats,
  getReviews,
  notifyManagerReview,
  replyToReview,
  resolveReview,
  sendGoogleReviewLink,
  sendReviewRequest,
} from '@/services/reviews.service';
import type { Review, ReviewStats } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatDateTime } from '@/utils/format';

const emptyStats: ReviewStats = {
  totalReviews: 0,
  submittedReviews: 0,
  pendingRequests: 0,
  requestedReviews: 0,
  negativeReviews: 0,
  positiveReviews: 0,
  averageRating: 0,
  reputationScore: 0,
  newReviewsThisMonth: 0,
  responseRate: 0,
  googleReviewSentCount: 0,
  ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
  sourceBreakdown: {},
  statusBreakdown: {},
  recentTrend: [],
};

function Stars({ rating, size = 'sm' }: { rating?: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`${cls} ${(rating ?? 0) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = status || 'pending_request';
  const tone = value === 'submitted'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : value === 'escalated'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : value === 'resolved'
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : value === 'requested'
          ? 'bg-violet-50 text-violet-700 ring-violet-200'
          : 'bg-slate-50 text-slate-700 ring-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {REVIEW_STATUS_LABELS[value] || capitalize(value.replace(/_/g, ' '))}
    </span>
  );
}

function SourceBadge({ source }: { source?: string }) {
  const label = REVIEW_SOURCE_LABELS[source || 'internal'] || capitalize(source || 'internal');
  return <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{label}</span>;
}

function StatCard({ title, value, helper, icon: Icon, tone = 'slate' }: {
  title: string;
  value: string | number;
  helper?: string;
  icon: typeof Star;
  tone?: 'slate' | 'amber' | 'emerald' | 'rose' | 'violet';
}) {
  const tones = {
    slate: 'from-slate-900 to-slate-700',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-500 to-red-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
        </div>
        <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-3 text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function guestLabel(review: Review) {
  const guest = review.guestId;
  if (typeof guest === 'object' && guest) return guest.fullName || guest.name || guest.phone || 'Guest';
  return 'Guest';
}

function bookingLabel(review: Review) {
  const booking = review.bookingId;
  if (typeof booking === 'object' && booking) return booking.bookingNumber || 'Booking';
  return typeof booking === 'string' ? booking.slice(-6) : '—';
}

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [stats, setStats] = useState<ReviewStats>(emptyStats);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [selected, setSelected] = useState<Review | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [form, setForm] = useState({ bookingId: '', guestId: '', rating: 5, feedback: '', source: 'internal' });

  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } = usePaginatedQuery<Review>({
    fetchFn: getReviews,
    initialParams: { guestId: searchParams.get('guestId') || undefined },
  });

  useEffect(() => {
    setParams((current) => ({
      ...current,
      page: 1,
      status: statusFilter || undefined,
      source: sourceFilter || undefined,
      ratingMin: ratingFilter ? Number(ratingFilter) : undefined,
      ratingMax: ratingFilter ? Number(ratingFilter) : undefined,
      guestId: searchParams.get('guestId') || undefined,
    }));
  }, [statusFilter, sourceFilter, ratingFilter, searchParams, setParams]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getReviewStats());
    } catch {
      setStats(emptyStats);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const openDetail = async (review: Review) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      setSelected(await getReviewById(getEntityId(review)));
    } catch {
      setSelected(review);
      showToast('Could not load full review details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    try {
      const updated = await replyToReview(getEntityId(selected), { managerReply: replyText.trim() });
      setSelected(updated);
      setReplyOpen(false);
      setReplyText('');
      showToast('Reply posted', 'success');
      refresh();
      loadStats();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to post reply', 'error');
    }
  };

  const handleAction = async (action: string) => {
    if (!selected) return;
    const id = getEntityId(selected);
    try {
      let updated = selected;
      if (action === 'send-request') updated = await sendReviewRequest(id);
      if (action === 'escalate') updated = await escalateReview(id);
      if (action === 'resolve') updated = await resolveReview(id);
      if (action === 'notify') updated = await notifyManagerReview(id);
      if (action === 'google') updated = await sendGoogleReviewLink(id);
      setSelected(updated);
      showToast('Review updated', 'success');
      refresh();
      loadStats();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Action failed', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!selected || !noteText.trim()) return;
    try {
      const updated = await addReviewNote(getEntityId(selected), { text: noteText.trim() });
      setSelected(updated);
      setNoteText('');
      showToast('Note added', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add note', 'error');
    }
  };

  const handleCreate = async () => {
    if (!form.bookingId || !form.guestId) {
      showToast('Booking ID and Guest ID are required', 'error');
      return;
    }
    try {
      await createReview({ ...form, rating: Number(form.rating) });
      setCreateOpen(false);
      setForm({ bookingId: '', guestId: '', rating: 5, feedback: '', source: 'internal' });
      showToast('Review created', 'success');
      refresh();
      loadStats();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create review', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteReview(getEntityId(deleteTarget));
      setDeleteTarget(null);
      if (selected && getEntityId(selected) === getEntityId(deleteTarget)) {
        setDrawerOpen(false);
        setSelected(null);
      }
      showToast('Review deleted', 'success');
      refresh();
      loadStats();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete review', 'error');
    }
  };

  const maxDistribution = Math.max(...Object.values(stats.ratingDistribution || {}), 1);

  const columns = [
    {
      key: 'reviewNumber',
      header: 'Review',
      render: (row: Review) => (
        <div>
          <div className="font-semibold text-slate-950">{row.reviewNumber || getEntityId(row).slice(-6)}</div>
          <div className="text-xs text-slate-500">{guestLabel(row)}</div>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (row: Review) => (
        <div className="space-y-1">
          <Stars rating={row.rating} />
          <div className="text-xs text-slate-500">{row.rating ? `${row.rating}/5` : 'Not rated'}</div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row: Review) => <StatusBadge status={row.status} /> },
    { key: 'source', header: 'Source', render: (row: Review) => <SourceBadge source={row.source} /> },
    {
      key: 'feedback',
      header: 'Feedback',
      render: (row: Review) => <span className="line-clamp-2 max-w-xs text-sm text-slate-600">{row.feedback || '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row: Review) => <span className="text-sm text-slate-500">{formatDateTime(row.submittedAt || row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row: Review) => (
        <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => openDetail(row)}>
          <Eye className="mr-1 h-3.5 w-3.5" />View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-900 to-violet-800 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">Reputation Management</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Reviews & Guest Sentiment</h1>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100">
              Monitor ratings, respond to feedback, request reviews after checkout, and protect your hotel reputation across Google, OTAs, and direct channels.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary !border-white/20 !bg-white/10 !text-white hover:!bg-white/20" onClick={() => { refresh(); loadStats(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />Refresh
            </button>
            <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>Add Review</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Average Rating" value={stats.averageRating || '—'} helper={`${stats.submittedReviews} submitted reviews`} icon={Star} tone="amber" />
        <StatCard title="Reputation Score" value={`${stats.reputationScore}%`} helper={`${stats.responseRate}% response rate`} icon={TrendingUp} tone="violet" />
        <StatCard title="Pending Requests" value={stats.pendingRequests + stats.requestedReviews} helper={`${stats.newReviewsThisMonth} new this month`} icon={Send} tone="emerald" />
        <StatCard title="Negative Reviews" value={stats.negativeReviews} helper={`${stats.positiveReviews} positive reviews`} icon={AlertTriangle} tone="rose" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-950">Rating Distribution</h3>
          <div className="mt-4 space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution?.[String(rating)] ?? 0;
              const width = Math.round((count / maxDistribution) * 100);
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex w-16 items-center gap-1 text-sm font-semibold text-slate-700">
                    {rating} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${width}%` }} />
                  </div>
                  <div className="w-10 text-right text-sm text-slate-500">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Source Breakdown</h3>
          <div className="mt-4 space-y-2">
            {Object.keys(stats.sourceBreakdown || {}).length === 0 ? (
              <p className="text-sm text-slate-500">No source data yet.</p>
            ) : Object.entries(stats.sourceBreakdown).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{REVIEW_SOURCE_LABELS[source] || capitalize(source)}</span>
                <span className="font-semibold text-slate-950">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <SelectInput
              label=""
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-w-[160px]"
              options={[{ value: '', label: 'All statuses' }, ...REVIEW_STATUSES.map((s) => ({ value: s, label: REVIEW_STATUS_LABELS[s] }))]}
            />
            <SelectInput
              label=""
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="min-w-[160px]"
              options={[{ value: '', label: 'All sources' }, ...REVIEW_SOURCES.map((s) => ({ value: s, label: REVIEW_SOURCE_LABELS[s] }))]}
            />
            <SelectInput
              label=""
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="min-w-[140px]"
              options={[{ value: '', label: 'All ratings' }, ...[5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${r} stars` }))]}
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={`rounded-xl p-2 ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`} onClick={() => setViewMode('table')}><LayoutList className="h-5 w-5" /></button>
            <button type="button" className={`rounded-xl p-2 ${viewMode === 'cards' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`} onClick={() => setViewMode('cards')}><LayoutGrid className="h-5 w-5" /></button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <DataTable<Review>
            columns={columns}
            data={data}
            isLoading={isLoading}
            error={error}
            onSearch={setSearch}
            searchPlaceholder="Search reviews..."
            rowKey={(row) => getEntityId(row)}
            emptyTitle="No reviews found"
            emptyDescription="Reviews will appear after checkout requests or manual entry."
            pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-100" />) : data.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <Star className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-700">No reviews yet</p>
                <p className="mt-1 text-sm text-slate-500">Review requests are created automatically after guest checkout.</p>
              </div>
            ) : data.map((review) => (
              <button key={getEntityId(review)} type="button" className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md" onClick={() => openDetail(review)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{guestLabel(review)}</p>
                    <p className="text-xs text-slate-500">{bookingLabel(review)}</p>
                  </div>
                  {review.isPositive === false ? <ThumbsDown className="h-4 w-4 text-rose-500" /> : <ThumbsUp className="h-4 w-4 text-emerald-500" />}
                </div>
                <div className="mt-3"><Stars rating={review.rating} /></div>
                <p className="mt-3 line-clamp-3 text-sm text-slate-600">{review.feedback || 'No feedback provided yet.'}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge status={review.status} />
                  <SourceBadge source={review.source} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        title="Review Details"
        size="xl"
        footer={selected ? (
          <div className="flex flex-wrap justify-end gap-2">
            {['pending_request', 'requested'].includes(selected.status || '') && (
              <button type="button" className="btn-secondary" onClick={() => handleAction('send-request')}><Send className="mr-2 h-4 w-4" />Send Request</button>
            )}
            {selected.status === 'submitted' && !selected.managerReply && (
              <button type="button" className="btn-secondary" onClick={() => setReplyOpen(true)}><MessageSquare className="mr-2 h-4 w-4" />Reply</button>
            )}
            {selected.isPositive === false && selected.status !== 'resolved' && (
              <button type="button" className="btn-secondary" onClick={() => handleAction('escalate')}>Escalate</button>
            )}
            {selected.status === 'escalated' && (
              <button type="button" className="btn-secondary" onClick={() => handleAction('resolve')}>Mark Resolved</button>
            )}
            <button type="button" className="btn-secondary" onClick={() => handleAction('google')}>Google Link</button>
            <button type="button" className="btn-secondary text-red-600" onClick={() => setDeleteTarget(selected)}>Delete</button>
          </div>
        ) : undefined}
      >
        {detailLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        ) : selected ? (
          <div className="space-y-6">
            <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-700 to-purple-700 p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-indigo-100">Guest Review</p>
                  <h3 className="mt-2 text-2xl font-bold">{guestLabel(selected)}</h3>
                  <p className="mt-1 text-sm text-indigo-100">{selected.reviewNumber} · {bookingLabel(selected)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selected.status} />
                  <SourceBadge source={selected.source} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Stars rating={selected.rating} size="md" />
                <span className="text-lg font-semibold">{selected.rating ? `${selected.rating}/5` : 'Awaiting rating'}</span>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Feedback</p>
                <p className="mt-2 text-sm text-slate-700">{selected.feedback || 'No feedback yet.'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Manager Reply</p>
                <p className="mt-2 text-sm text-slate-700">{selected.managerReply || 'No reply yet.'}</p>
              </div>
            </section>

            {selected.departmentRatings && (
              <section className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-950">Department Ratings</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {DEPARTMENT_RATING_FIELDS.map(({ key, label }) => {
                    const value = selected.departmentRatings?.[key as keyof typeof selected.departmentRatings];
                    if (!value) return null;
                    return (
                      <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        <span>{label}</span>
                        <Stars rating={value} />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-950">Internal Notes</p>
              <div className="mb-3 space-y-2">
                {(selected.notes ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No internal notes yet.</p>
                ) : selected.notes?.map((note, index) => (
                  <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p>{note.text}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(note.createdAt)}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <TextArea label="" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add internal note..." rows={2} />
                <button type="button" className="btn-secondary self-end" onClick={handleAddNote}>Add</button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-950">Timeline</p>
              {(selected.timeline ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No timeline events yet.</p>
              ) : (
                <div className="space-y-2">
                  {selected.timeline?.map((item, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm">
                      <div className="font-semibold text-slate-950">{capitalize(item.action.replace(/\./g, ' '))}</div>
                      {item.message && <p className="text-slate-600">{item.message}</p>}
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={replyOpen} onClose={() => setReplyOpen(false)} title="Reply to Review" footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setReplyOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleReply}>Post Reply</button>
        </div>
      }>
        <TextArea label="Manager Reply" value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={5} placeholder="Thank the guest and address their feedback professionally..." />
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Review" footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleCreate}>Save Review</button>
        </div>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Booking ID" value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} required />
          <FormInput label="Guest ID" value={form.guestId} onChange={(e) => setForm({ ...form, guestId: e.target.value })} required />
          <SelectInput label="Rating" value={String(form.rating)} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} options={[5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${r} stars` }))} />
          <SelectInput label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} options={REVIEW_SOURCES.map((s) => ({ value: s, label: REVIEW_SOURCE_LABELS[s] }))} />
          <div className="sm:col-span-2">
            <TextArea label="Feedback" value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} rows={4} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Review"
        message="This review will be archived. This action can affect reputation analytics."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
