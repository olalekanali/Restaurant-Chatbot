import { Schema, model, Document, Types } from "mongoose";

export type OrderStatus = "placed" | "paid" | "cancelled";

export interface OrderLineDoc {
  name: string;
  option: string;
  price: number;
}

export interface OrderDoc extends Document {
  _id: Types.ObjectId;
  sessionId: string;
  reference: string; // short human-friendly reference
  lines: OrderLineDoc[];
  total: number;
  status: OrderStatus;
  paymentReference?: string; // Paystack transaction reference
  scheduledFor?: Date | null;
  createdAt: Date;
}

const orderLineSchema = new Schema<OrderLineDoc>(
  {
    name: { type: String, required: true },
    option: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema<OrderDoc>({
  sessionId: { type: String, required: true, index: true },
  reference: { type: String, required: true, unique: true },
  lines: { type: [orderLineSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["placed", "paid", "cancelled"],
    default: "placed",
  },
  paymentReference: { type: String },
  scheduledFor: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const Order = model<OrderDoc>("Order", orderSchema);
