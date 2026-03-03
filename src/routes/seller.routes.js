import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getDashboardStats, getMyOrders, getMyProducts, updateStock } from "../controllers/seller.controllers.js";
import { blacklistCheck } from "../middlewares/blacklist.middleware.js";

const router = Router()

router.use(verifyJWT, blacklistCheck)

router.route("/my-products").get(getMyProducts)
router.route("/update-stock/:productId").patch(updateStock)
router.route("/my-orders").get(getMyOrders)
router.route("/get-stats").get(getDashboardStats)

export default router