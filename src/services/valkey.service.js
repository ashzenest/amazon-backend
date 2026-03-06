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

const cacheSet = async(key, value, remainingTTL) => {
    const valkeyClient = getValkeyClient()

    await valkeyClient.set(key, JSON.stringify(value),
        {
            expiry: {type: TimeUnit.Seconds, count: remainingTTL}
        }
    )
}

const cacheGet = async(key) => {
    const valkeyClient = getValkeyClient()
    const result = await valkeyClient.get(key)
    return result ? JSON.parse(result) : null
}

const cacheDel = async(key) => {
    const valkeyClient = getValkeyClient()
    await valkeyClient.del(key)
}

const invalidateSellerProductsCache = async(sellerId) => {
    const valkeyClient = getValkeyClient()
    let cursor = 0
    const keys = []

    do{
        const result = await valkeyClient.scan(cursor, {match: `products:seller:${sellerId}:page:*`,  count: 100})
        cursor = result.cursor
        keys.push(...result.keys)//there is a reason for this
    } while(cursor !== 0)

    if(keys.length){
        await valkeyClient.del(keys)
    }
}

const acquireValkeyLock = async(lockKey, lockValue, remainingTTL) => {
    const valkeyClient = getValkeyClient()
    const lockAcquired = await valkeyClient.set(lockKey, lockValue,
    {
        expiry: {type: TimeUnit.Seconds, count: remainingTTL},
        conditionalSet: "onlyIfDoesNotExist"
    })
    return lockAcquired !== null
}

const releaseValkeyLock = async(lockKey, lockValue) => {
    const valkeyClient = getValkeyClient()
    const value = await valkeyClient.get(lockKey)
    if(lockValue === value){
        await valkeyClient.del(lockKey)
    }
}

const getWithLock = async(cacheKeys, ttl, dbQuery) => {
    const cached = await cacheGet(cacheKeys)
    if(cached){
        return cached
    }

    const lockValue = crypto.randomUUID()
    const lockAcquired = await acquireValkeyLock(cacheKeys, lockValue, 10)
    if(!lockAcquired){
        await new Promise((resolve) => setTimeout(resolve, 50))
        const cached = await cacheGet(cacheKeys)
        if(cached){
            return cached
        }
        const result = await dbQuery()
        return result
    }

    const result = await dbQuery()
    cacheSet(cacheKeys, result, ttl)
    await releaseValkeyLock(cacheKeys, lockValue)
    return result
}

export {
    blacklistToken,
    isTokenBlacklisted,
    cacheDel,
    invalidateSellerProductsCache,
    getWithLock
}