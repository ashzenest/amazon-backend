import { Worker } from "bullmq";
import { getRedisClient } from "../../config/valkey.config.js"
import { deleteFromCloudinary } from "../../services/cloudinary.service.js"

let cloudinaryWorker = null

const createCloudinaryWorker = () => {
    cloudinaryWorker = new Worker("cloudinaryQueue", async(job) => {
        if(job.name === "deleteFromCloudinary"){
            const {filePublicId} = job.data
            await deleteFromCloudinary(filePublicId)
        }
    }, {connection: getRedisClient()})
}

export {createCloudinaryWorker}