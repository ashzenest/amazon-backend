import { deleteProduct, deleteReview, deleteUser, getAllUsers, getOrderById, getUserById, updateProduct, updateUserRole, updateUserStatus } from "../controllers/admin.controllers.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";
import { Router } from "express";


const router = Router()

router.use(verifyJWT)
router.use(authorizeRoles("admin"))


router.route("/users").get(getAllUsers)
router.route("/users/:userId").get(getUserById)
router.route("/users/:userId").delete(deleteUser)
router.route("/users/:userId/role").patch(updateUserRole)
router.route("/users/:userId/status").patch(updateUserStatus)
router.route("/products/:productId").patch(updateProduct)
router.route("/products/:productId").delete(deleteProduct)
router.route("/reviews/:reviewId").delete(deleteReview)
router.route("/orders/:orderId").get(getOrderById)

export default router