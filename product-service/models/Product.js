const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            maxlength: 500,
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
        },
        stock: {
            type: Number,
            required: true,
            default: 0,
            min: [0, "Stock cannot be negative"],
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
            enum: ["electronics", "clothing", "food", "books", "accessories", "other"],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for fast category and search queries
productSchema.index({ category: 1 });
productSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Product", productSchema);
