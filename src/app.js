import cookieParser from "cookie-parser"
import express from "express"
import cors from "cors"
import userRouter from "./routes/user.routes.js"
import reviewRouter from "./routes/review.routes.js"
import categoryRouter from "./routes/category.routes.js"
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
app.use("/api/reviews", reviewRouter)
app.use("/api/categories", categoryRouter)

// app.use((err, req, res, next) => {
//   const statusCode = err.statusCode || 500
//   const message = err.message || "Internal Server Error"
  
//   res.status(statusCode).json({
//     success: false,
//     message,
//     errors: err.errors || []
//   })
// })

export {app}