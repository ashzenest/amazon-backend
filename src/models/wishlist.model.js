import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    }]
},{timestamps: true})

wishlistSchema.methods.addProduct = async function(productId){
    const exist = this.products.some((id) =>
        id.toString() === productId.toString()
    )
    if(!exist){
        this.products.push(productId)
        //return this.save()
    }
    const savedWishlist = await this.save()
    return {
        wishlist: savedWishlist,
        added: !exist,
        message: exist ? "Already in wishlist" : "Added to wishlist"
    }
}

wishlistSchema.methods.removeProduct = async function(productId) {
    const initialLength = this.products.length
    this.products = this.products.filter((id) =>
        id.toString() !== productId.toString()
    )
    const removed = this.products.length !== initialLength
    const savedWishlist = await this.save()
    return {
        wishlist: savedWishlist,
        removed,
        message: removed ? "Removed from wishlist" : "Product not in wishlist"
    }
};

wishlistSchema.methods.hasProduct = function(productId){
    return this.products.some((id) =>
        id.toString() === productId.toString()
    )
}

export const Wishlist = mongoose.model("Wishlist", wishlistSchema)