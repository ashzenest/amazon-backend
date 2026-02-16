import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { extractPublicId } from "../utils/extractPublicId.js"
import { sendRegistrationEmail } from "../services/email.service.js"

//ONLY ACCEPT STRING AS INPUT

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
    
        return {
            accessToken,
            refreshToken
        }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const {username, fullname, email, password} = req.body

    const existingUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existingUser){
        throw new ApiError(400, "username or email already taken")
    }

    const avatarLocalPath = req.file?.path
    let avatar;
    if(avatarLocalPath){
        avatar = await uploadOnCloudinary(avatarLocalPath)
    }
    let user;
    try{
        user = await User.create({
        username,
        fullname,
        email,
        password,
        avatar: avatar?.url || "https://res.cloudinary.com/ashzenest/image/upload/v1770836588/defaultuser_lnxhcy.jpg"
        })
    }catch(error){
        if(error.name === "ValidationError"){
            throw new ApiError(400, error.message)
        }
        throw new ApiError(500, "Could not create the user")
    }
    
    const createdUser = await User.findById(user._id).select("-refreshToken")

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    sendRegistrationEmail(createdUser.email, createdUser.fullname)
    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
    const {username, email, password} = req.body

    if (!username || !email) {
        throw new ApiError(400, "Username or email is required")
    }

    if (!password) {
        throw new ApiError(400, "Password is required")
    }
    
    const user = await User.findOne({
        $or: [{username}, {email}]
    }).select("+password")

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(400, "Incorrect password")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, {}, "Login successfull"))
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: null
            }
        })
    
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged out successfully"))  
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken
    if(!token){
        throw new ApiError(401, "Invalid refresh token")
    }
    let decodedToken
    try {
        decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token")
    }
    const user = await User.findById(decodedToken._id)
    if(!user){
        throw new ApiError(401, "Invalid refresh token")
    }

    if(user.refreshToken !== token){
        throw new ApiError(401, "Refresh token has been revoked or is invalid")
    }
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(decodedToken._id)
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, {}, "Refresh access token successfull"))
})

const changeCurrentPassword = asyncHandler(async(req, res) => {

    const {oldPassword, newPassword} = req.body

    if(!oldPassword || !newPassword){
        throw new ApiError(400, "Both old and new password are required")
    }

    if(oldPassword === newPassword){
        throw new ApiError(400, "New password must be different from old password")
    }

    const user = await User.findById(req.user._id).select("+password")
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isOldPasswordCorrect){
        throw new ApiError(400, "Incorrect current password")
    }

    user.password = newPassword
    user.refreshToken = null

    try {
        await user.save()
    } catch (error) {
        if(error.name === "ValidationError"){
            throw new ApiError(400, error.message)
        }
        throw new ApiError(500, "Could not change password")
    }

    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "Password changed successfully. Please login again."))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar?.url){
        throw new ApiError(500, "Could not upload on cloudinary")
    }
    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {avatar: avatar.url}
        },{new: true}).select("-refreshToken")

    if(!user){
        throw new ApiError(500, "Could not update user avatar")
    }
    if(req.user.avatar && !req.user.avatar.includes("/defaultuser/")){
        const publicId = extractPublicId(req.user.avatar)
        if(publicId){
            await deleteFromCloudinary(publicId)
        }
    }

    return res.status(200).json(new ApiResponse(200, user, "Avatar changed successfully"))
})

const updateFullname = asyncHandler(async (req, res) => {
    const {newFullname} = req.body

    if(!newFullname || !newFullname.trim()){
        throw new ApiError(400, "fullname is required")
    }
    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set:{fullname: newFullname}
        },{new: true, runValidators: true}
    ).select("-refreshToken")

    return res.status(200).json(new ApiResponse(200, user, "fullname changed successfully"))
})

const usernameAvailableOrNot = asyncHandler(async (req, res) => {
    const {username} = req.query
     if (!username) {
        throw new ApiError(400, "Username is required")
    }
    const available = await User.findOne({username})
    if(available){
        return res.status(200).json(new ApiResponse(200, {available: false}, "Username is already taken"))
    } else {
        return res.status(200).json(new ApiResponse(200, {available: true}, "Username is available"))
    }
})

const changeUsername = asyncHandler(async (req, res) => {
    const {username, password} = req.body
    const newUsername = username?.trim()

    if(!newUsername || !password?.trim()){
        throw new ApiError(400, "Both username and password are required")
    }
    if(newUsername === req.user.username){
        throw new ApiError(400, "New username must be different from old username")
    }

    const existingUser = await User.findOne({username: newUsername})
    if(existingUser){
        throw new ApiError(400, "Username already taken")
    }

    const user = await User.findById(req.user._id).select("+password")
    if(!user){
        throw new ApiError(500, "Could not find the user")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)
    if(!isPasswordCorrect){
        throw new ApiError(400, "Password is incorrect")
    }

    user.username = newUsername

    try{
        await user.save()
    }catch(error){
        if(error.name === "ValidationError"){
            throw new ApiError(400, error.message)
        }
        throw new ApiError(500, "Could not change the username")
    }

    const updatedUser = await User.findById(req.user._id).select("-refreshToken") 

    return res.status(200).json(new ApiResponse(200, updatedUser, "Username changed successfully"))

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateUserAvatar,
    updateFullname,
    usernameAvailableOrNot,
    changeUsername
}