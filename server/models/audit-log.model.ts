import mongoose, { Schema } from "mongoose";

const auditLogSchema = new Schema({
  actorId: { type: String, required: true, index: true },
  actorRole: { type: String, enum: ["Admin", "Staff"], required: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true }
}, { versionKey: false });

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
