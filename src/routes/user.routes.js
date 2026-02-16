import { Router } from "express";
import {changeCurrentPassword, changeEmailRequest, changeUsername, loginUser, logoutUser, refreshAccessToken, registerUser, updateFullname, updateUserAvatar, usernameAvailableOrNot, verifychangeEmailRequest} from "../controllers/user.controllers.js"
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register-user").post(upload.single("avatar"), registerUser)
router.route("/login-user").post(loginUser)

//SECURE ROUTE
router.route("/refresh-tokens").post(refreshAccessToken)
router.route("/logout-user").post(verifyJWT, logoutUser)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/update-avatar").post(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/change-fullname").post(verifyJWT, updateFullname)
router.route("/check-username").get(verifyJWT, usernameAvailableOrNot)
router.route("/change-username").patch(verifyJWT, changeUsername)
router.route("/request-email-change").post(verifyJWT, changeEmailRequest)
router.route("/verify-email-change").get(verifychangeEmailRequest)

export default router