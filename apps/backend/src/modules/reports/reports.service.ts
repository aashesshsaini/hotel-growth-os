import { Booking, Guest, Payment } from '../../models';
interface Viewer { hotelId?: string }
export const getReports = async (viewer: Viewer) => {
  const filter = viewer.hotelId ? { hotelId: viewer.hotelId, isDeleted: { $ne: true } } : { isDeleted: { $ne: true } };
  const [bookings, guests, revenue] = await Promise.all([
    Booking.countDocuments(filter), Guest.countDocuments(filter), Payment.aggregate([{ $match: { ...filter, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  return { bookings, guests, revenue: revenue[0]?.total ?? 0 };
};
