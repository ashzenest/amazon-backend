import "dotenv/config";
import "./config/email.config.js";
import "./config/cloudinary.config.js";
import { connectDatabase } from "./config/database.config.js";
import { app } from "./app.js";
import { connectValkey } from "./config/valkey.config.js";

const start = async() => {
    await connectDatabase()
    await connectValkey()
    app.listen(process.env.PORT || 5000, () => {
        console.log("App is working")
    })
}

start().catch((error) => {
    console.error(error);
    process.exit(1);
})