export const CORPORATE_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'contract_review', label: 'Contract Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'active_client', label: 'Active Client' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'lost', label: 'Lost' },
  { value: 'negotiating', label: 'Negotiation (Legacy)' },
  { value: 'confirmed', label: 'Active Client (Legacy)' },
] as const;

export const CORPORATE_COMPANY_TYPES = [
  { value: 'corporate', label: 'Corporate' },
  { value: 'hotel_chain', label: 'Hotel Chain' },
  { value: 'travel_agency', label: 'Travel Agency' },
  { value: 'mice', label: 'MICE / Events' },
  { value: 'government', label: 'Government' },
  { value: 'airline', label: 'Airline' },
  { value: 'other', label: 'Other' },
] as const;

export const CORPORATE_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'strategic', label: 'Strategic' },
] as const;

export const CORPORATE_PAYMENT_TERMS = [
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'net_7', label: 'Net 7 Days' },
  { value: 'net_15', label: 'Net 15 Days' },
  { value: 'net_30', label: 'Net 30 Days' },
  { value: 'net_45', label: 'Net 45 Days' },
  { value: 'net_60', label: 'Net 60 Days' },
  { value: 'credit_account', label: 'Credit Account' },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-100 text-slate-700 ring-slate-200',
  contacted: 'bg-sky-100 text-sky-700 ring-sky-200',
  meeting_scheduled: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  proposal_sent: 'bg-violet-100 text-violet-700 ring-violet-200',
  negotiation: 'bg-amber-100 text-amber-700 ring-amber-200',
  negotiating: 'bg-amber-100 text-amber-700 ring-amber-200',
  contract_review: 'bg-orange-100 text-orange-700 ring-orange-200',
  approved: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  active_client: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  confirmed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  lost: 'bg-rose-100 text-rose-700 ring-rose-200',
};

export const emptyCorporateForm = () => ({
  companyName: '',
  companyType: 'corporate',
  industry: '',
  website: '',
  contactPerson: '',
  phone: '',
  email: '',
  gstNumber: '',
  panNumber: '',
  requirements: '',
  estimatedRooms: 0,
  estimatedGuests: 0,
  status: 'new',
  priority: 'medium',
  source: 'direct',
  followUpDate: '',
  notes: '',
  totalValue: 0,
  paidAmount: 0,
  creditLimit: 0,
  paymentTerms: 'net_30',
  corporateRate: 0,
  specialPricing: '',
  roomAllocation: 0,
  assignedTo: '',
});

export const getStatusLabel = (status: string) =>
  CORPORATE_STATUSES.find((item) => item.value === status)?.label || status.replace(/_/g, ' ');
