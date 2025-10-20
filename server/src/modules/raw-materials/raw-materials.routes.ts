import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  createRawMaterialSchema,
  updateRawMaterialSchema,
} from "./raw-materials.validation.js";
import {
  createRawMaterialHandler,
  getRawMaterialsHandler,
  updateRawMaterialHandler,
  deleteRawMaterialHandler,
} from "./raw-materials.controller.js";

const router = Router();

// Apply the isAuthenticated middleware to all routes in this file
router.use(isAuthenticated);

// Define the routes
router.post("/", validate(createRawMaterialSchema), createRawMaterialHandler);
router.get("/", getRawMaterialsHandler);
router.put("/:id", validate(updateRawMaterialSchema), updateRawMaterialHandler);
router.delete("/:id", deleteRawMaterialHandler);

export default router;
