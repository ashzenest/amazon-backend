import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { DB_NAME } from "../constant.js";

const tryConnectingWithDatabase = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        return
    } catch (error) {
        throw new ApiError(500, "Database connection failed")
    }
}

const connectDatabase = async() => {
    for(let i = 0; i<5; i++){
        try{
            await tryConnectingWithDatabase()
            console.log("Successfully connected to Database")
            return
        }catch(error){
            console.log(`Connection failed for ${i + 1} time`)
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
        }
    }
    console.log("Maximum tries failed")
    process.exit(1)
}

export {connectDatabase}