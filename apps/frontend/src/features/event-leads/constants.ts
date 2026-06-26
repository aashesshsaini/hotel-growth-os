export const EVENT_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'requirement_collected', label: 'Requirement Collected' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'site_visit_scheduled', label: 'Site Visit Scheduled' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'advance_pending', label: 'Advance Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
  { value: 'quoted', label: 'Quoted (Legacy)' },
  { value: 'completed', label: 'Completed (Legacy)' },
] as const;

export const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'corporate_event', label: 'Corporate Event' },
  { value: 'conference', label: 'Conference' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'training', label: 'Training' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'party', label: 'Party' },
  { value: 'group_stay', label: 'Group Stay' },
  { value: 'other', label: 'Other' },
] as const;

export const EVENT_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'event_planner', label: 'Event Planner' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'direct', label: 'Direct' },
  { value: 'other', label: 'Other' },
] as const;

export const EVENT_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-100 text-slate-700 ring-slate-200',
  contacted: 'bg-sky-100 text-sky-700 ring-sky-200',
  requirement_collected: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  proposal_sent: 'bg-violet-100 text-violet-700 ring-violet-200',
  quoted: 'bg-violet-100 text-violet-700 ring-violet-200',
  site_visit_scheduled: 'bg-purple-100 text-purple-700 ring-purple-200',
  negotiation: 'bg-amber-100 text-amber-700 ring-amber-200',
  advance_pending: 'bg-orange-100 text-orange-700 ring-orange-200',
  confirmed: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  converted: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  lost: 'bg-rose-100 text-rose-700 ring-rose-200',
};

export const emptyEventForm = () => ({
  eventName: '',
  eventType: 'wedding',
  contactPerson: '',
  phone: '',
  email: '',
  eventDate: '',
  eventEndDate: '',
  eventStartTime: '',
  eventEndTime: '',
  guestCount: 50,
  budgetMin: 0,
  budgetMax: 0,
  estimatedValue: 0,
  packageName: '',
  packagePrice: 0,
  requirements: {
    venue: '',
    roomBlock: '',
    catering: '',
    decoration: '',
    avSetup: '',
    specialRequests: '',
  },
  status: 'new',
  priority: 'medium',
  source: 'direct',
  followUpDate: '',
  notes: '',
  totalValue: 0,
  paidAmount: 0,
  advanceAmount: 0,
  assignedTo: '',
});

export const getStatusLabel = (status: string) =>
  EVENT_STATUSES.find((item) => item.value === status)?.label || status.replace(/_/g, ' ');

export const getEventTypeLabel = (eventType: string) =>
  EVENT_TYPES.find((item) => item.value === eventType)?.label || eventType.replace(/_/g, ' ');
