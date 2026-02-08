import dotenv from "dotenv"
import { connectDatabase } from "./src/db.js";
import { app } from "./app.js";

dotenv.config({
    path:'./.env'
})

connectDatabase()
    .then(() => {
        app.listen(process.env.PORT || 5000, () => {
            console.log("App is working")
        })
    })
    .catch((error) => {
        console.log("Error: ", error)
    })