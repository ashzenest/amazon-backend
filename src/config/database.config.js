import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDatabase = async() => {
    for(let i = 0; i<5; i++){
        try{
            await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
            console.log("Successfully connected to Database")
            return
        }catch(error){
            console.log(`Connection failed for ${i + 1} time`)
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
        }
    }
    console.log("Database connection failed after maximum retries")
    process.exit(1)
}

export {connectDatabase}