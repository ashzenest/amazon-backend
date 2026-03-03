import { Router } from "express";
import { createCategory, deleteCategory, getAllCategories, getCategoryById, updateCategory } from "../controllers/category.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { blacklistCheck } from "../middlewares/blacklist.middleware.js";

const router = Router()

router.route("/").get(getAllCategories)
router.route("/:categoryId").get(getCategoryById)

router.use(verifyJWT, blacklistCheck)

router.route("/create").post(createCategory)
router.route("/delete/:categoryId").delete(deleteCategory)
router.route("/update/:categoryId").patch(updateCategory)

export default router