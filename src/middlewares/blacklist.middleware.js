import { isTokenBlacklisted } from "../services/valkey.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const blacklistCheck = asyncHandler(async (req, _, next) => {
    const isBlacklisted = await isTokenBlacklisted(req.token)
    if(isBlacklisted){
        throw new ApiError(401, "Token revoked")
    }
    next()
})

export {blacklistCheck}