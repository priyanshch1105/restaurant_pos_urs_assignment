import mongoose, { Schema } from "mongoose";
const menuSchema = new Schema({ name: { type: String, required: true, trim: true }, category: { type: String, required: true, trim: true }, price: { type: Number, required: true, min: 0 }, available: { type: Boolean, default: true }, active: { type: Boolean, default: true } }, { timestamps: true });
export const MenuModel = mongoose.models.MenuItem || mongoose.model("MenuItem", menuSchema);
