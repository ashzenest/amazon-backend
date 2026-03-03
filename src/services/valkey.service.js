import { getValkeyClient } from "../config/valkey.config.js";
import { TimeUnit } from "@valkey/valkey-glide";

const blacklistToken = async(userId, accessToken, remainingTTL) => {
    if(remainingTTL <= 0){
        return
    }
    const valkeyClient = getValkeyClient()
    await valkeyClient.set(`blacklist:${accessToken}`, userId,
        {
            expiry: {type: TimeUnit.Seconds, count: remainingTTL}
        }
    )
}

const isTokenBlacklisted = async(accessToken) => {
    const valkeyClient = getValkeyClient()
    const isBlacklisted = await valkeyClient.get(`blacklist:${accessToken}`)
    return isBlacklisted !== null
}

export {
    blacklistToken,
    isTokenBlacklisted
}