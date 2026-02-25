import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Order } from "../models/order.model.js";
import { Category } from "../models/category.model.js";
import { Wishlist } from "../models/wishlist.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js"
import { addDays } from "../utils/calculateDate.js";

const getAllUsers = asyncHandler(async(req, res) => {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const filter = {}
    if(req.query.role){
        const validRoles = ["customer", "seller", "admin"]
        if(!validRoles.includes(req.query.role)){
            throw new ApiError(400, "Invalid role")
        }
        filter.role = req.query.role
    }
    if(req.query.status){
        const validStatus = ["active", "suspended", "banned"]
        if(!validStatus.includes(req.query.status)){
            throw new ApiError(400, "Invalid Status")
        }
        filter.status = req.query.status
    }
    if(req.query.fullname){
        filter.fullname = {
            $regex: req.query.fullname,
            $options: "i"
        }
    }
    if(req.query.username){
        filter.username = req.query.username
    }
    if(req.query.email){
        filter.email = req.query.email
    }
    if(req.query.search){
        filter.$or = [
            {fullname: {$regex: req.query.search, $options: "i"}},
            {username: {$regex: req.query.search, $options: "i"}},
            {email: {$regex: req.query.search, $options: "i"}}
        ]
    }

    let sort = {}
    if(req.query.sortBy){
        const sortField = req.query.sortBy
        const sortOrder = req.query.order === "desc" ? -1 : 1
        sort[sortField] = sortOrder
    }else{
        sort = {createdAt: -1}
    }
    const totalUsers = await User.countDocuments(filter)
    const users = await User.find(filter).sort(sort).skip(skip).limit(limit).select("-refreshToken")
    return res.status(200).json(new ApiResponse(200,
        {
            users,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit),
                totalUsers,
                limit
            }
        }, "Users fetched successfully"
    ))
})

const getUserById = asyncHandler(async(req, res) => {
    const {userId} = req.params
    if(!mongoose.Types.ObjectId.isValid(userId)){
        throw new ApiError(400, "Invalid User Id format")
    }

    const user = await User.findById(userId)

    if(!user){
        throw new ApiError(404, "User not found")
    }

    return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"))
})

const deleteProduct = asyncHandler(async (req, res) => {
    const {productId} = req.params
    if(!mongoose.Types.ObjectId.isValid(productId)){
        throw new ApiError(400, "Invalid Product Id format")
    }
    const product = await Product.findByIdAndDelete(productId).select("-refreshToken")
    if(!product){
        throw new ApiError(404, "Product not found")
    }
    for(const imageUrl of product.image){
        const publicId = extractPublicId(imageUrl)
        await deleteFromCloudinary(publicId)
    }
    return res.status(200).json(new ApiResponse(200, {}, "Product deleted successfully"))
})

const updateProduct = asyncHandler(async (req, res) => {
    const {productId} = req.params
    const {name, description, status, category} = req.body

    if(!mongoose.Types.ObjectId.isValid(productId)){
        throw new ApiError(400, "Invalid Product Id format")
    }

    const updateFields = {}
    
    const newName = name?.trim()?.toLowerCase()
    if(newName){
        updateFields.name = newName
    }
    if(description?.trim){
        updateFields.description = description
    }
    if(status){
        updateFields.status = status
    }
    if(category){
        const existingCategory = await Category.findOne({name: category})
        if(existingCategory){
            updateFields.category = existingCategory._id
        } else {
            throw new ApiError(400, "Invalid Category")
        }
    }

    const product = await Product.findByIdAndUpdate(productId,
        {
            $set: updateFields
        }, {new: true, runValidators: true}
    )
    if(!product){
        throw new ApiError(404, "Product not found")
    }

    return res.status(200).json(new ApiResponse(200, product, "Product updated successfully"))
})

const deleteReview = asyncHandler(async(req, res) => {
    const {reviewId} = req.params
    if(!mongoose.Types.ObjectId.isValid(reviewId)){
        throw new ApiError(400, "Invalid Review Id format")
    }
    const review = await Review.findByIdAndDelete(reviewId)
    if(!review){
        throw new ApiError(404, "Review not found")
    }
    return res.status(200).json(new ApiResponse(200, {}, "Review deleted successfully"))
})

const getOrderById = asyncHandler(async (req, res) => {
    const {orderId} = req.params
    if(!mongoose.Types.ObjectId.isValid(orderId)){
        throw new ApiError(400, "Invalid Order Id format")
    }
    const order =  await Order.findById(orderId).populate("products.product")
    if(!order){
        throw new ApiError(404, "Order not found")
    }
    return res.status(200).json(new ApiResponse(200, order, "Order fetched successfully"))
})

const updateUserStatus = asyncHandler(async(req, res) => {
    const {userId} = req.params
    const {action, duration, reason} = req.body

    if(!mongoose.Types.ObjectId.isValid(userId)){
        throw new ApiError(400, "Invalid User Id format")
    }

    const validActions = ["active", "suspended", "banned", "strike"]
    if(!validActions.includes(action)){
        throw new ApiError(400, "Invalid action")
    }

    if(action === "banned" || action === "suspended"){
        if (!reason || !reason.trim()) {
            throw new ApiError(400, "Reason is required for ban/suspension")
        }
    }
    if (action === "suspended") {
        if (!duration) {
            throw new ApiError(400, "Suspension duration is required")
        }
        if (duration <= 0) {
            throw new ApiError(400, "Suspension duration must be positive")
        }

    }

    let user

    if(action === "banned"){
        user = await User.findByIdAndUpdate(userId,
            {
                $set: {status: action, "statusMetaData.reason": reason, "statusMetaData.changedAt": new Date(), "statusMetaData.changedBy": req.user._id},
                $unset: {refreshToken: ""}
            },{runValidators: true, new: true})

    }else if(action === "suspended"){
        const suspensionExpiresAt = addDays(new Date(), duration)
        user = await User.findByIdAndUpdate(userId,
            {
                $set: {status: action, "statusMetaData.reason": reason, "statusMetaData.changedAt": new Date(), "statusMetaData.changedBy": req.user._id, "statusMetaData.suspensionExpiresAt": suspensionExpiresAt},
                $unset: {refreshToken: ""}
            }, {runValidators: true, new: true})
    }else if(action === "strike"){
        user = await User.findById(userId).select("-refreshToken")
        user.strikeCount += 1
        if(user.strikeCount >= 3){
            user.status = "banned"
        }
        user.statusMetaData.changedAt = new Date()
        user.statusMetaData.changedBy = req.user._id
        await user.save()

    }else if(action === "active"){
        user = await User.findByIdAndUpdate(userId,
            {
                $set: {status: action, strikeCount: 0, "statusMetaData.changedAt": new Date(), "statusMetaData.changedBy":req.user._id},
                $unset: {"statusMetaData.reason": "", "statusMetaData.suspensionExpiresAt": ""}
            },{runValidators: true, new: true})
    }
    if(!user){
        throw new ApiError(404, "User not found")
    }
    return res.status(200).json(new ApiResponse(200, user, `User ${action} successfully`))

})

const deleteUser = asyncHandler(async(req, res) => {
    const {userId} = req.params
    if(!mongoose.Types.ObjectId.isValid(userId)){
        throw new ApiError(400, "Invalid User Id format")
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    let user
    let products = []
    let avatarUrl

    try {
        user = await User.findByIdAndDelete(userId, {session})
        if(!user){
            throw new ApiError(404, "User not found")
        }
        avatarUrl = user.avatar
        if(user.wishlist){
            await Wishlist.findByIdAndDelete(user.wishlist, {session})
        }
        if(user.products.length > 0){
            products = await Product.find({seller: userId}, {session})
            await Product.deleteMany({seller: userId}, {session})
        }
        if(user.orders.length > 0){
            await Order.deleteMany({user: userId}, {session})
        }
        await Review.deleteMany({user: userId}, {session})
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();

        throw new ApiError(500, "Transaction failed: " + error.message)
    } finally {
        session.endSession();
    }

    if(avatarUrl && !avatarUrl.includes("defaultuser")){
        const publicId = extractPublicId(avatarUrl)
        await deleteFromCloudinary(publicId)
    }
    for(const product of products){
        if(product.image?.length > 0){
            for(const link of product.image){
                const publicId = extractPublicId(link)
                await deleteFromCloudinary(publicId)
            }
        }  
    }
    
    
    return res.status(200).json(new ApiResponse(200, {}, "User deleted successfully"))
})

const updateUserRole = asyncHandler(async (req, res) => {
    const {userId} = req.params
    const {role} = req.body
    const validRoles = ["customer", "seller", "admin"]
    if(!validRoles.includes(role)){
        throw new ApiError(400, "Invalid role")
    }
    if(userId === req.user._id.toString() && role !== "admin"){
        throw new ApiError(400, "Cannot change your own admin role")
    }
    if(!mongoose.Types.ObjectId.isValid(userId)){
        throw new ApiError(400, "Invalid User Id format")
    }
    const user = await User.findByIdAndUpdate(userId,
        {
            $set: {role}
        },{new: true, runValidators: true}
    )
    if(!user){
        throw new ApiError(404, "User not found")
    }
    return res.status(200).json(new ApiResponse(200, {}, "User role changed successfully"))
})


export {
    getAllUsers,
    getUserById,
    deleteProduct,
    updateProduct,
    deleteReview,
    getOrderById,
    updateUserStatus,
    deleteUser,
    updateUserRole
}

//ANALYTICAL SLOPS
// getPlatformStats, getRevenueStats, getTopSellingProducts, getTopSellers, getDashboardStats

//ONLY POSSIBLE AFTER COMPLETING ORDER CONTROLLERS
// getAllOrders, updateOrderStatus, cancelOrder, refundOrder
// getAllTransactions, getPayoutRequests, approvePayout //escrow setup(?)



//THIS WILL NEED FOR ME TO CREATE WORKFLOW FOR IT
// getAllReports, getReportById, resolveReport, deleteReportedContent
// approveSeller rejectSellerApplicatio