import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin } from '../utils/schemaHelpers';

export interface IBookingRoom extends Document {
  bookingId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  roomTypeId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  pricePerNight: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bookingRoomSchema = new Schema<IBookingRoom>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    pricePerNight: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

bookingRoomSchema.index({ bookingId: 1, roomId: 1 });
bookingRoomSchema.index({ hotelId: 1, roomId: 1 });
bookingRoomSchema.plugin(softDeletePlugin);

export const BookingRoom = mongoose.model<IBookingRoom>('BookingRoom', bookingRoomSchema);
