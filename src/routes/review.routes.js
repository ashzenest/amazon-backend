import { Router } from "express";
import { createReview, updateReview, deleteReview, getReviewsByProduct } from "../controllers/review.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { blacklistCheck } from "../middlewares/blacklist.middleware.js";

const router = Router()

router.route("/product/:productId").get(getReviewsByProduct)

router.use(verifyJWT, blacklistCheck)

router.route("/create/:productId").post(createReview)
router.route("/update/:reviewId").patch(updateReview)
router.route("/delete/:reviewId").delete(deleteReview)

export default router