import { Router } from "express";
import { createCategory, deleteCategory, getAllCategories, getCategoryById, updateCategory } from "../controllers/category.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/").get(getAllCategories)
router.route("/:categoryId").get(getCategoryById)
router.route("/create").post(verifyJWT, createCategory)
router.route("/delete/:categoryId").delete(verifyJWT, deleteCategory)
router.route("/update/:categoryId").patch(verifyJWT, updateCategory)

export default router