import { getCloudinaryQueue } from "../index.js"

const jobOptions = {
    attempts: 5,
    backoff: {
        type: "exponential",
        delay: 1000
    }
}

const addDeleteFromCloudinary = (filePublicId) => {
    getCloudinaryQueue().add("deleteFromCloudinary", {
        filePublicId
    }, jobOptions)
}

export {addDeleteFromCloudinary}