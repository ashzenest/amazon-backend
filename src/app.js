import cookieParser from "cookie-parser"
import express from "express"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(cookieParser())
app.use(express.json())

export {app}