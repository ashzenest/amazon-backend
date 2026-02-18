import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique: true
    },
    description: {
        type: String
    }
},{timestamps: true})

export const Category = mongoose.model("Category", categorySchema)