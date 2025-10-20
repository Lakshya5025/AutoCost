import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createProductSchema } from "./products.validation.js";
import {
  createProductHandler,
  getProductsHandler,
  deleteProductHandler,
} from "./products.controller.js";

const router = Router();

router.use(isAuthenticated);

router.post("/", validate(createProductSchema), createProductHandler);
router.get("/", getProductsHandler);
router.delete("/:id", deleteProductHandler);

export default router;
