import { asyncHandler } from "../utils/asyncHandler.js";
import { Order } from "../models/order.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { Review } from "../models/review.model.js";
import mongoose from "mongoose"

const createReview = asyncHandler(async (req, res) => {
    const { rating, comment} = req.body
    const {productId} = req.params
    if(!mongoose.Types.ObjectId.isValid(productId)){
        throw new ApiError(400, "Invalid Product ID format")
    }
    const product = await Product.findById(productId)
    if(!product){
        throw new ApiError(404, "Product not found")
    }

    const hasPurchased = await Order.findOne({
        user: req.user._id,
        "products.product": productId,
        status: { $in: ["delivered", "confirmed"]}
    })
    if(!hasPurchased){
        throw new ApiError(403, "You can only review product you have purchased")
    }

    const existingReview = await Review.findOne({user: req.user._id, product: productId})
    if(existingReview){
        throw new ApiError(400, "You have already reviewed this product")
    }
    let review
    try {
        review = await Review.create({
            user: req.user._id,
            product: productId,
            rating,
            comment
        })
    } catch (error) {
        if(error.name === "ValidationError"){
            throw new ApiError(400, "Rating is required")
        }
        throw new ApiError(500, "Could not create review")
    }
    return res.status(201).json(new ApiResponse(201, review,"Review published successfully"))
})

const updateReview  = asyncHandler(async (req, res) => {
    const {rating, comment} = req.body
    const {reviewId} = req.params
    if(!mongoose.Types.ObjectId.isValid(reviewId)){
        throw new ApiError(400, "Invalid Review ID format")
    }

    let review

    try {
        review = await Review.findOneAndUpdate({user: req.user._id, _id: reviewId},
            {
                $set: {rating, comment}
            }, {new: true, runValidators: true}
        )
    } catch (error) {
        if(error.name === "ValidationError"){
            throw new ApiError(400, error.message)
        }
        throw new ApiError(500, "Could not update review")
    }
    if(!review){
        throw new ApiError(404, "Review not found or you don't have permission to update it")
    }

    return res.status(200).json(new ApiResponse(200, review, "Review updated successfully"))
})

const deleteReview = asyncHandler(async (req, res) => {
    const {reviewId} = req.params
    if(!mongoose.Types.ObjectId.isValid(reviewId)){
        throw new ApiError(400, "Invalid Review Id format")
    }
    const review = await Review.findOneAndDelete({user: req.user._id, _id: reviewId})
    if(!review){
        throw new ApiError(404, "No review found")
    }
    return res.status(200).json(new ApiResponse(200, {}, "Review deleted successfully"))
})

const getReviewsByProduct = asyncHandler(async (req, res) => {
    const {productId} = req.params
    if(!mongoose.Types.ObjectId.isValid(productId)){
        throw new ApiError(400, "Invalid Product Id format")
    }
    const reviews = await Review.find({product: productId})
        .populate("user", "username avatar fullname")
        .sort({createdAt: -1})
    return res.status(200).json(new ApiResponse(200, reviews, "Reviews for the product fetched successfully"))
})

export {
    createReview,
    updateReview,
    deleteReview,
    getReviewsByProduct
}