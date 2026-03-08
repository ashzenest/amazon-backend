import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { Product } from "../models/product.model.js";
import mongoose from "mongoose";
import { Category } from "../models/category.model.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { cacheDel, invalidateSellerProductsCache } from "../services/valkey.service.js";
import { CacheKeys } from "../utils/cacheKeys.js";

//ADD CACHING HERE TOO
const getMyProducts = asyncHandler(async (req, res) => {
    const filter = {
        seller: req.user._id
    }
    if(req.query.brand){
        filter.brand = req.query.brand
    }
    if(req.query.status){
        const validStatuses = ["active", "out_of_stock", "coming_soon", "draft"]
        if(!validStatuses.includes(req.query.status)){
            throw new ApiError(400, "Invalid status. Must be one of: active, out_of_stock, coming_soon, draft")
        }
        filter.status = req.query.status
    }
    if(req.query.categoryId){
        if(mongoose.Types.ObjectId.isValid(req.query.categoryId)){
            const category = await Category.findById(req.query.categoryId)
            if(category){
                filter.category = category._id
            } else{
                throw new ApiError(404, "Category not found")
            }
        }else{
            throw new ApiError(400, "Invalid Category Id format")
        }
    }
    if(req.query.minPrice || req.query.maxPrice){
        filter.price = {}
        if(req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice)
        if(req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice)
    }
    if(req.query.search){
        filter.$or = [
            { name: { $regex: req.query.search, $options: 'i' } },
            { description: { $regex: req.query.search, $options: 'i' } }
        ]
    }
    let sort = {}
    if(req.query.sortBy){
        const sortField = req.query.sortBy
        const sortOrder = req.query.order === 'desc' ? -1 : 1
        sort[sortField] = sortOrder
    } else {
        sort = { createdAt: -1 }
    }


    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const totalProducts = await Product.countDocuments(filter)
    const products = await Product.find(filter).sort(sort).skip(skip).limit(limit).populate("category", "name")

    return res.status(200).json(new ApiResponse(200, {
        products,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts,
            limit
        }
    }, "Seller's products fetched successfully"))

})

const updateStock = asyncHandler(async (req, res) => {
    const {productId} = req.params
    const {quantity, operation} = req.body

    const validOperations = ["add", "subtract", "set"]
    if(!validOperations.includes(operation)){
        throw new ApiError(400, "Invalid operation. Must be 'add', 'subtract', or 'set'")
    }
    if(!quantity || quantity <= 0){
        throw new ApiError(400, "Quantity must be a positive number")
    }
    if(!mongoose.Types.ObjectId.isValid(productId)){
        throw new ApiError(400, "Invalid Product Id format")
    }

    let product
    if(operation === "add"){
        product = await Product.findOneAndUpdate({_id: productId, seller: req.user._id},
            {
                $inc: {stock: quantity}
            },{new: true, runValidators: true}
        )
    }else if(operation === "subtract"){
        product = await Product.findOneAndUpdate({_id: productId, seller: req.user._id},
            {
                $inc: {stock: -quantity}
            },{new: true, runValidators: true}
        )
    }else if(operation === "set"){
        product = await Product.findOneAndUpdate({_id: productId, seller: req.user._id},
            {
                $set: {stock: quantity}
            },{new: true, runValidators: true}
        )
    }

    if(!product){
        throw new ApiError(404, "Could not find product")
    }
    await cacheDel(CacheKeys.product(productId))
    await invalidateSellerProductsCache(product.seller)
    
    return res.status(200).json(new ApiResponse(200, product, "Product's stock updated successfully"))
})

const getMyOrders = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const filter = {
        "products.seller": req.user._id
    }
    if(req.query.userId){
        if(!mongoose.Types.ObjectId.isValid(req.query.userId)){
            throw new ApiError(400, "Invalid User Id format")
        }
        const user = await User.findById(req.query.userId)
        if(!user){
            throw new ApiError(404, "User not found")
        }
        filter.user = req.query.userId
    }
    if(req.query.status){
        const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
        if(!validStatuses.includes(req.query.status)){
            throw new ApiError(400, "Invalid status")
        }
        filter.status = req.query.status
    }
    if(req.query.paymentStatus){
        const validStatuses = ["paid", "pending", "failed"]
        if(!validStatuses.includes(req.query.paymentStatus)){
            throw new ApiError(400, "Invalid payment status")
        }
        filter.paymentStatus = req.query.paymentStatus
    }
    if(req.query.paymentMethod){
        const validStatuses = ["card", "upi", "netbanking", "wallet", "cod"]
        if(!validStatuses.includes(req.query.paymentMethod)){
            throw new ApiError(400, "Invalid payment method")
        }
        filter.paymentMethod = req.query.paymentMethod
    }
    if(req.query.productId){
        if(!mongoose.Types.ObjectId.isValid(req.query.productId)){
            throw new ApiError(400, "Invalid Product ID Format")
        }
        const product = await Product.findById(req.query.productId)
        if(!product){
            throw new ApiError(404, "Product not found")
        }
        filter["products.product"] = req.query.productId
    }
    if(req.query.search){
        filter._id = req.query.search
    }
    if(req.query.startDate || req.query.endDate){
        filter.createdAt = {}
        if(req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate)
        if(req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate)
    }
    const sort = {}
    if(req.query.sortBy){
        const sortField = req.query.sortBy
        const sortOrder = req.query.order === 'desc' ? -1 : 1
        sort[sortField] = sortOrder
    } else{
        sort.createdAt = -1
    }
    
    const totalOrders = await Order.countDocuments(filter)
    const orders = await Order.find(filter).sort(sort).skip(skip).limit(limit)
    return res.status(200).json(new ApiResponse(200, {
        orders,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders,
            limit
        }
    }, "Orders fetched successfully"))
})

const getDashboardStats = asyncHandler(async (req, res) => {
    const filter = {
        "products.seller": req.user._id
    }
    if(req.query.userId){
        if(!mongoose.Types.ObjectId.isValid(req.query.userId)){
            throw new ApiError(400, "Invalid User Id format")
        }
        const user = await User.findById(req.query.userId)
        if(!user){
            throw new ApiError(404, "User not found")
        }
        filter.user = req.query.userId
    }
    if(req.query.status){
        const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
        if(!validStatuses.includes(req.query.status)){
            throw new ApiError(400, "Invalid status")
        }
        filter.status = req.query.status
    }
    if(req.query.paymentStatus){
        const validStatuses = ["paid", "pending", "failed"]
        if(!validStatuses.includes(req.query.paymentStatus)){
            throw new ApiError(400, "Invalid payment status")
        }
        filter.paymentStatus = req.query.paymentStatus
    }
    if(req.query.paymentMethod){
        const validStatuses = ["card", "upi", "netbanking", "wallet", "cod"]
        if(!validStatuses.includes(req.query.paymentMethod)){
            throw new ApiError(400, "Invalid payment method")
        }
        filter.paymentMethod = req.query.paymentMethod
    }
    if(req.query.productId){
        if(!mongoose.Types.ObjectId.isValid(req.query.productId)){
            throw new ApiError(400, "Invalid Product ID Format")
        }
        const product = await Product.findById(req.query.productId)
        if(!product){
            throw new ApiError(404, "Product not found")
        }
        filter["products.product"] = req.query.productId
    }
    if(req.query.search){
        filter._id = req.query.search
    }
    if(req.query.startDate || req.query.endDate){
        filter.createdAt = {}
        if(req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate)
        if(req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate)
    }
    const totalOrders = await Order.countDocuments(filter)

    const orderByStatus = await Order.aggregate([
        {$match: filter},
        {$group: {_id: "$status", count: {$sum: 1}}}
    ])
    const ordersByPaymentStatus = await Order.aggregate([
        {$match: filter},
        {$group: {_id: "$paymentStatus", count: {$sum: 1}}}
    ])
    const topProducts = await Order.aggregate([
        {$match: filter},
        {$unwind: "$products"},
        {$group: {_id: "$products.product", totalSold: {$sum: "$products.quantity"}, revenues: {$sum: {$multiply: ["$products.quantity", "$products.priceAtOrderTime"]}}}},
        {$sort: {totalSold: -1}},
        {$limit: 10},
        {$lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productInfo"
        }},
        {$unwind: "$productInfo"}
    ])
    const totalRevenuesResult = await Order.aggregate([
        {
            $match: filter
        },{
            $unwind: "$products"
        },{
            $match: {"products.seller": req.user._id}
        },{
            $group: {
                _id: null,
                total: {$sum: {$multiply: ["$products.quantity", "$products.priceAtOrderTime"]}}
            }
        }
    ])
    const totalRevenues = totalRevenuesResult[0]?.total || 0
    return res.status(200).json(new ApiResponse(200, {
        totalOrders,
        totalRevenues,
        orderByStatus,
        ordersByPaymentStatus,
        topProducts
    }, "Dashboard stats fetched successfully"))
})

export {
    getMyProducts,
    updateStock,
    getMyOrders,
    getDashboardStats
}