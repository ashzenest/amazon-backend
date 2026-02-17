import cookieParser from "cookie-parser"
import express from "express"
import cors from "cors"
import userRouter from "./routes/user.routes.js"
import helmet from "helmet"
import mongoSanitize from "express-mongo-sanitize"

const app = express()

app.use(helmet())
app.use(mongoSanitize())

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(cookieParser())
app.use(express.static("public"))


app.use("/api/users", userRouter)

export {app}