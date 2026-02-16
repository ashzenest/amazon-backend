import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        minlength: [3, "Username must be at least 3 characters"]
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, "Fullname must be at least 2 characters"]
    },
    avatar: {
        type: String,
        default: "https://res.cloudinary.com/ashzenest/image/upload/v1770836588/defaultuser_lnxhcy.jpg"
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
        lowercase: true
    },
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    }],
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    }],
    password: {
        type: String,
        required: true,
        select: false,
        minlength: [8, "Password must be at least 8 characters"]
    },
    role: {
        type: String,
        enum: ["customer", "seller", "admin"],
        default: "customer"
    },
    wishlist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wishlist"
    },
    refreshToken: {
        type: String
    }
}, {timestamps: true})

userSchema.pre("save", async function(next) {
    if(!this.isModified("password")){
        return next()
    }
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id: this._id,
        username: this.username,
        email: this.email
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })
}

userSchema.methods.generateEmailChangeToken = function(newEmail){
    return jwt.sign({
        _id: this._id,
        newEmail: newEmail,
        purpose: "email-change"
    },
    process.env.EMAIL_CHANGE_TOKEN_SECRET,
    {
        expiresIn: process.env.EMAIL_CHANGE_TOKEN_EXPIRY
    })
}

userSchema.methods.generatePasswordResetToken = function(){
    return jwt.sign({
        _id: this._id,
        purpose: "password-reset"
    },
    process.env.PASSWORD_RESET_TOKEN_SECRET,
    {
        expiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRY
    })
}

export const User = mongoose.model("User", userSchema)