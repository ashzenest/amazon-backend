import { Queue } from "bullmq";
import { getRedisClient } from "../config/valkey.config.js";

let emailQueue = null
let cloudinaryQueue = null

const getEmailQueue = () => {
    if(!emailQueue){
        emailQueue = new Queue("emailQueue", { connection: getRedisClient() })
    }
    return emailQueue
}

const getCloudinaryQueue = () => {
    if(!cloudinaryQueue){
        cloudinaryQueue = new Queue("cloudinaryQueue", {connection: getRedisClient()})
    }
    return cloudinaryQueue
}

export {
    getEmailQueue,
    getCloudinaryQueue
}