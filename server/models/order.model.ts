import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema({
     orderNumber: {
         type: String, unique: true, required: true, index: true
         }, 
         type: {
             type: String, enum: ["Dine-in", "Takeaway"], required: true },
              tableNumber: {
                 type: Number, min: 1 
                },
               items: [{
                 menuItemId: { type: String, required: true }, name: { type: String, required: true }, price: { type: Number, required: true, min: 0 }, quantity: { type: Number, required: true, min: 1 }, lineTotal: { type: Number, required: true, min: 0 } 
                }],
                 status: { 
                    type: String, enum: ["Pending", "Preparing", "Ready", "Completed"], default: "Pending" },
                     subtotal: {
                         type: Number, required: true, min: 0 
                        },
                         taxRate: {
                             type: Number, required: true, min: 0 
                            },
                             tax: { type: Number, required: true, min: 0 }, discount: { type: Number, required: true, min: 0 }, total: { type: Number, required: true, min: 0 },
                              paymentMethod: { type: String, enum: ["Cash", "UPI", "Card"] },
                               paymentStatus: { type: String, enum: ["Pending", "Paid"], default: "Pending" }, paymentAmount: { type: Number, min: 0 }, paidAt: Date, receivedBy: String, createdBy: String },
                                { timestamps: true });
export const OrderModel = mongoose.models.Order || mongoose.model("Order", orderSchema);
