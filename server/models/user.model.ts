import mongoose, { Schema } from "mongoose";
const userSchema = new Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true, trim: true },
  password: String,
  passwordHash: String,
  role: { type: String, enum: ["Admin", "Staff"], required: true },
  active: { type: Boolean, default: true }
});
export const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
