import { GlideClient } from "@valkey/valkey-glide";
import Redis from "ioredis";

// Two separate clients are intentional:
// - GlideClient is used for app-level cache/auth operations (valkey-glide if official client for Valkey)
// - ioredis is used exclusively for BullMQ, because BullMQ require ioredis
// valkey-glide does not implement the ioredis API and cannot be used with BullMQ

let valkeyClient = null
let redisClient = null

const connectValkey = async() => {
    for(let i = 0; i < 5; i++){
        try {
            valkeyClient = await GlideClient.createClient({
                addresses: [{
                    host: process.env.VALKEY_HOST,
                    port: parseInt(process.env.VALKEY_PORT)
                }]
            });
            console.log("Valkey connected");
            return;
        } catch(error){
            console.error(`Valkey connection failed attempt ${i + 1}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
    console.log("Valkey connection failed after maximum tries");
    process.exit(1);
}

const connectRedis = async() =>{
    for(let i = 0; i < 5; i++){
        try {
            redisClient = new Redis({
                port: process.env.VALKEY_PORT,
                host: process.env.VALKEY_HOST,
                db: 1,
                lazyConnect: true,
                maxRetriesPerRequest: null
            });
            await redisClient.connect()
            console.log("Redis connected");
            return;
        } catch(error){
            console.error(`Redis connection failed attempt ${i + 1}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
    console.log("Redis connection failed after maximum tries");
    process.exit(1);
}

const getValkeyClient = () => {
    if(!valkeyClient){
        throw new Error("Valkey not initialized")
    }
    return valkeyClient
}

const getRedisClient = () => {
    if(!redisClient){
        throw new Error("Redis not initialized")
    }
    return redisClient
}

export {
    connectValkey,
    getValkeyClient,
    connectRedis,
    getRedisClient
}