import { Schema, model, Document, Types } from "mongoose";

export interface MenuOption {
  label: string;
  price: number; // in Naira
}

export interface MenuItemDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  emoji: string;
  options: MenuOption[];
  sortIndex: number;
}

const optionSchema = new Schema<MenuOption>(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const menuItemSchema = new Schema<MenuItemDoc>({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  emoji: { type: String, default: "🍽️" },
  options: { type: [optionSchema], required: true },
  sortIndex: { type: Number, default: 0 },
});

export const MenuItem = model<MenuItemDoc>("MenuItem", menuItemSchema);
