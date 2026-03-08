import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id).select("-refreshToken")
        if(!user){
            throw new ApiError(401, "Invalid access token")
        }
        if(user.status !== "active"){
            throw new ApiError(401, `User is ${user.status}`)
        }
        req.user = user
        req.token = token
        req.decodedToken = decodedToken
        next()
    } catch (error) {
        throw new ApiError(401, "Invalid access token")
    }
})

const authorizeRoles = (...roles) => {
    return asyncHandler(async(req, _, next) => {
        if(!roles.includes(req.user.role)){
            throw new ApiError(403, "Forbidden")
        }
        next()
    })
}

export {
    verifyJWT,
    authorizeRoles
}