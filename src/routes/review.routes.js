import { Router } from "express";
import { createReview, updateReview, deleteReview, getReviewsByProduct } from "../controllers/review.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/product/:productId").get(getReviewsByProduct)
router.route("/create/:productId").post(verifyJWT, createReview)
router.route("/update/:reviewId").patch(verifyJWT, updateReview)
router.route("/delete/:reviewId").delete(verifyJWT, deleteReview)

export default router