import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import {User} from "../models/user.model.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../services/cloudinary.service.js"
import { extractPublicId } from "../utils/extractPublicId.js"
import mongoose from "mongoose";

const createProduct = asyncHandler(async (req, res) => {
    const {name, price, description, stock, brand, category} = req.body
    const imagePaths = req.files
    const sellerId = req.user._id


    if(!name?.trim() || !description?.trim() || !brand?.trim()){
        throw new ApiError(400, "Name, description, and brand are required")
    }
    if(stock === undefined || stock < 0){
        throw new ApiError(400, "Stock must be 0 or greater")
    }
    if(price < 0){
        throw new ApiError(400, "Price cant be lower than 0")
    }
    if(!imagePaths.length){
        throw new ApiError(400, "Atleast one image is required")
    }
    if(imagePaths.length > 10){
        throw new ApiError(400, "Maximum 10 images allowed")
    }
    
    const existingCategory = await Category.findOne({name: category})
    if(!existingCategory){
        throw new ApiError(404, "Category not found")
    }

    const cloudinaryLinks = []

    for(const file of imagePaths){
        const cloudinaryLink = await uploadOnCloudinary(file.path)
        if(!cloudinaryLink){
            for(const link of cloudinaryLinks){
                const publicId = extractPublicId(link)
                await deleteFromCloudinary(publicId)
            }
            throw new ApiError(500, "Could not upload images on cloudinary")
        }
        cloudinaryLinks.push(cloudinaryLink.url)
    }
    let product

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        product = await Product.create([{
            name,
            seller: sellerId,
            image: cloudinaryLinks,
            price,
            description,
            stock,
            brand,
            category: existingCategory._id

        }], {session})
        await User.findByIdAndUpdate(sellerId,
            {
                $addToSet: {products: product[0]._id}
            }, {session})

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();

        for(const link of cloudinaryLinks){
            const publicId = extractPublicId(link)
            await deleteFromCloudinary(publicId)
        }

        throw new ApiError(500, "Transaction failed: " + error.message)
    } finally {
        session.endSession();
    }
    return res.status(201).json(new ApiResponse(201, product[0], "Product created sucessfully"))
})

const deleteProduct = asyncHandler(async (req, res) => {
    const {productId} = req.params
    if(!mongoose.Types.ObjectId.isValid(productId)){
        throw new ApiError(400, "Invalid Product Id format")
    }
    const product = await Product.findOneAndDelete({_id: productId, seller: req.user._id})
    if(!product){
        throw new ApiError(400, "You are not allowed to delete the product")
    }
    for(const imageUrl of product.image){
        const publicId = extractPublicId(imageUrl)
        await deleteFromCloudinary(publicId)
    }
    return res.status(200).json(new ApiResponse(200, {}, "Product deleted successfully"))
})

const getProductById = asyncHandler(async (req, res) => {
    const {productId} = req.params
    if(!mongoose.Types.ObjectId.isValid(productId)){
        throw new ApiError(400, "Invalid Product Id format")
    }
    const product = await Product.findById(productId)
        .populate("seller", "username fullname avatar")
        .populate("category", "name description")
    if(!product){
        throw new ApiError(404, "Product not found")
    }
    return res.status(200).json(new ApiResponse(200, product, "Product fetched successfully"))
})

const updateProduct = asyncHandler(async (req, res) => {
    const {productId} = req.params
    const {name, price, description, status, brand, category} = req.body
    const imagePaths = req.files

    if(!mongoose.Types.ObjectId.isValid(productId)){
        throw new ApiError(400, "Invalid Product Id format")
    }

    const updateFields = {}
    
    const newName = name?.trim()?.toLowerCase()
    if(newName){
        updateFields.name = newName
    }
    if(price !== undefined){
        if(price < 0) throw new ApiError(400, "Price cannot be negative")
        updateFields.price = price
    }
    if(description?.trim()){
        updateFields.description = description
    }
    if(status){
        updateFields.status = status
    }
    const newBrand = brand?.trim().toLowerCase()
    if(newBrand){
        updateFields.brand = newBrand
    }
    if(category){
        const existingCategory = await Category.findOne({name: category})
        if(existingCategory){
            updateFields.category = existingCategory._id
        } else {
            throw new ApiError(400, "Invalid Category")
        }
    }
    let cloudinaryLinks = []
    if(imagePaths && imagePaths.length){
        for(const file of imagePaths){
            const cloudinaryLink = await uploadOnCloudinary(file.path)
            if(!cloudinaryLink){
                for(const link of cloudinaryLinks){
                    const publicId = extractPublicId(link)
                    await deleteFromCloudinary(publicId)
                }
                throw new ApiError(500, "Could not upload images to cloudinary")
            }
            cloudinaryLinks.push(cloudinaryLink.url)
        }
        updateFields.image = cloudinaryLinks
    }

    const product = await Product.findOne({_id: productId, seller: req.user._id})
    if(!product){
        throw new ApiError(404, "Product not found or You are not allowed to perform this operation")
    }

    let updatedProduct
    try {
        updatedProduct = await Product.findByIdAndUpdate(productId,
            {
                $set: updateFields
            }, {new: true, runValidators: true}
        )
        if(imagePaths && imagePaths.length){
            for(const image of product.image){
                const publicId = extractPublicId(image)
                await deleteFromCloudinary(publicId)
            }
        }
    } catch (error) {
        for(const link of cloudinaryLinks){
            const publicId = extractPublicId(link)
            await deleteFromCloudinary(publicId)
        }
        throw new ApiError(500, "Transaction failed: " + error.message)
    }

    return res.status(200).json(new ApiResponse(200, updatedProduct, "Product updated successfully"))
})

const getProductsBySeller = asyncHandler(async (req, res) => {
    const {sellerId} = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    if(!mongoose.Types.ObjectId.isValid(sellerId)){
        throw new ApiError(400, "Invalid Seller Id format")
    }

    const totalProducts = await Product.countDocuments({seller: sellerId})
    const products = await Product.find({seller: sellerId})
        .skip(skip)
        .limit(limit)

    return res.status(200)
        .json(new ApiResponse(200,
            {
                products,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalProducts / limit),
                    totalProducts
                }
        }, "Products fetched successfully"))
})

const getAllProducts = asyncHandler(async( req, res) => {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const filter = {}

    if(req.query.category){
        filter.category = req.query.category
    }
    if(req.query.brand){
        filter.brand = req.query.brand
    }
    if(req.query.status){
        filter.status = req.query.status
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

    const totalProducts = await Product.countDocuments(filter)
    const products = await Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("category", "name")
        .populate("seller", "username fullname")

    return res.status(200).json(new ApiResponse(200, {
        products,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts,
            limit
        }
    }, "Products fetched successfully"))
})

export {
    createProduct,
    deleteProduct,
    updateProduct,
    getProductById,
    getProductsBySeller,
    getAllProducts
}