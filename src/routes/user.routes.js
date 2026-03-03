import { Router } from "express";
import {addToWishlist, changeCurrentPassword, changeEmailRequest, changePasswordRequest, changeUsername, getCurrentUser, getOrders, getReviews, getWishlist, loginUser, logoutUser, refreshAccessToken, registerUser, removeFromWishlist, updateFullname, updateUserAvatar, usernameAvailableOrNot, verifychangeEmailRequest, verifyChangePasswordRequest} from "../controllers/user.controllers.js"
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { blacklistCheck } from "../middlewares/blacklist.middleware.js";

const router = Router()

router.route("/register-user").post(upload.single("avatar"), registerUser)
router.route("/login-user").post(loginUser)
router.route("/verify-password-reset").post(verifyChangePasswordRequest)
router.route("/verify-email-change").get(verifychangeEmailRequest)
router.route("/refresh-tokens").post(refreshAccessToken)

router.use(verifyJWT, blacklistCheck)

router.route("/logout-user").post(logoutUser)
router.route("/change-password").post(changeCurrentPassword)
router.route("/update-avatar").post(upload.single("avatar"), updateUserAvatar)
router.route("/change-fullname").post(updateFullname)
router.route("/check-username").get(usernameAvailableOrNot)
router.route("/change-username").patch(changeUsername)
router.route("/request-email-change").post(changeEmailRequest)
router.route("/me").get(getCurrentUser)
router.route("/me/reviews").get(getReviews)
router.route("/me/get-wishlist").get(getWishlist)
router.route("/me/get-orders").get(getOrders)
router.route("/add-to-wishlist").post(addToWishlist)
router.route("/remove-from-wishlist").post(removeFromWishlist)
router.route("/forgot-password").post(changePasswordRequest)

export default router