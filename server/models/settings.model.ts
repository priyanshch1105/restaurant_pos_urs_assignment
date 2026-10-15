import mongoose, { Schema } from "mongoose";

const settingsSchema = new Schema({
  key: { type: String, unique: true, required: true },
  taxRate: { type: Number, required: true, min: 0, max: 100 },
  maxDiscount: { type: Number, required: true, min: 0 }
});

export const SettingsModel = mongoose.models.RestaurantSettings || mongoose.model("RestaurantSettings", settingsSchema);
