import "dotenv/config";
import { connectRedis } from "./config/valkey.config.js";
import { createCloudinaryWorker } from "./queues/processors/cloudinary.processor.js";
import { createEmailWorker } from "./queues/processors/email.processor.js";

const start = async() => {
    await connectRedis()
    createEmailWorker()
    createCloudinaryWorker()
}

start().catch((error) => {
    console.error(error)
    process.exit(1)
})