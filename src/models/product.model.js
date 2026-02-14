import mongoose from "mongoose";

const productSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    image: [{
        type: String,
        required: true
    }],
    price: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    brand: {
        type: String
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    }
},{
    timestamps: true
})

export const Product = mongoose.model("Product", productSchema)