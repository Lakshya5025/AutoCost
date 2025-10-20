// server/src/modules/raw-materials/raw-materials.controller.ts
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Handlers for raw-materials routes.
 * Notes:
 * - Use req.userId (set by isAuthenticated middleware) to access the logged-in user's ID.
 * - Use `cost` (not `price`) when creating/updating raw materials, as your Prisma types expect `cost`.
 * - We cast some Prisma query results to any where the schema-driven type didn't match our assumptions.
 */

/** Recalculate product costs that depend on a raw material */
export async function recalculateProductCostsForMaterial(
  rawMaterialId: string,
  userId: string // userId is passed explicitly or derived from req.userId in handlers
) {
  // Fetch productIngredients that reference this raw material
  // Ensure we only fetch ingredients linked to products owned by this user
  const ingredients = await prisma.productIngredient.findMany({
    where: {
      rawMaterialId: rawMaterialId,
      product: {
        userId: userId, // Filter by product owner
      },
    },
    include: {
      product: true,
      rawMaterial: true,
    },
  });

  // Calculate the total cost contribution for each affected product
  const productCostUpdates: Record<
    string,
    { totalIngredientCost: number; additionalCost: number }
  > = {};

  for (const ing of ingredients) {
    if (!ing.product) continue;

    const productId = ing.product.id;
    if (!productCostUpdates[productId]) {
      // Fetch all ingredients for this product to recalculate total cost
      const allIngredientsForProduct = await prisma.productIngredient.findMany({
        where: { productId: productId },
        include: { rawMaterial: true },
      });

      let totalIngredientCost = 0;
      allIngredientsForProduct.forEach((item) => {
        if (item.rawMaterial) {
          // Ensure percentage and cost are valid numbers
          const percentage =
            typeof item.percentage === "number" ? item.percentage : 0;
          const cost =
            typeof item.rawMaterial.cost === "number"
              ? item.rawMaterial.cost
              : 0;
          // Cost contribution = (percentage / 100) * cost_per_quintal
          totalIngredientCost += (percentage / 100) * cost;
        }
      });

      productCostUpdates[productId] = {
        totalIngredientCost: totalIngredientCost,
        additionalCost:
          typeof ing.product.additionalCost === "number"
            ? ing.product.additionalCost
            : 0,
      };
    }
  }

  // Prepare Prisma update promises
  const updates = Object.entries(productCostUpdates).map(([productId, costs]) =>
    prisma.product.update({
      where: { id: productId, userId: userId }, // Ensure user owns the product
      data: {
        // Recalculate totalCost based on all ingredients + additional cost
        totalCost: costs.totalIngredientCost + costs.additionalCost,
      },
    })
  );

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  return { updatedProducts: updates.length };
}

/** List raw materials for the authenticated user */
export async function listRawMaterials(req: Request, res: Response) {
  try {
    const userId = req.userId; // <-- Use req.userId here
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const materials = await prisma.rawMaterial.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(materials);
  } catch (err) {
    console.error("listRawMaterials:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** Create a raw material */
export async function createRawMaterial(req: Request, res: Response) {
  try {
    const userId = req.userId; // <-- Use req.userId here
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, cost = 0 } = req.body as any;
    if (!name || typeof name !== "string")
      return res.status(400).json({ message: "name required" });
    if (typeof cost !== "number" || cost < 0) {
      return res
        .status(400)
        .json({ message: "Valid cost (non-negative number) required" });
    }

    // Check if material with the same name already exists for this user
    const existingMaterial = await prisma.rawMaterial.findUnique({
      where: { name_userId: { name, userId } },
    });
    if (existingMaterial) {
      return res
        .status(409)
        .json({ message: `Material with name '${name}' already exists.` });
    }

    const created = await prisma.rawMaterial.create({
      data: { name, cost, userId },
    });

    return res.status(201).json(created);
  } catch (err: any) {
    // Prisma unique constraint violation code
    if (
      err.code === "P2002" &&
      err.meta?.target?.includes("name") &&
      err.meta?.target?.includes("userId")
    ) {
      return res
        .status(409)
        .json({
          message: `Material with name '${req.body.name}' already exists.`,
        });
    }
    console.error("createRawMaterial:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** Update a raw material and recalc product costs */
export async function updateRawMaterial(req: Request, res: Response) {
  try {
    const id = req.params.id as string | undefined;
    const userId = req.userId; // <-- Use req.userId here
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!id) return res.status(400).json({ message: "id required" });

    const { name, cost } = req.body as any;
    const data: any = {};

    // Only allow updating cost for now based on validation schema
    // if (typeof name === "string") data.name = name;
    if (typeof cost !== "number" || cost < 0) {
      return res
        .status(400)
        .json({ message: "Valid cost (non-negative number) required" });
    }
    data.cost = cost;

    // Check if the material belongs to the user before updating
    const material = await prisma.rawMaterial.findFirst({
      where: { id, userId },
    });

    if (!material) {
      return res
        .status(404)
        .json({
          message:
            "Raw material not found or you don't have permission to edit it.",
        });
    }

    const updated = await prisma.rawMaterial.update({
      where: { id: id, userId: userId }, // Use combined condition for security
      data,
    });

    // Recalculate dependent product costs
    await recalculateProductCostsForMaterial(id, userId);

    // Return the updated material instead of just the count
    // Fetch it again to ensure we return the final state
    const updatedMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
    });
    return res.json(updatedMaterial);
  } catch (err: any) {
    if (err.code === "P2025") {
      // Prisma code for record not found during update
      return res
        .status(404)
        .json({
          message:
            "Raw material not found or you don't have permission to edit it.",
        });
    }
    console.error("updateRawMaterial:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** Get raw material by id */
export async function getRawMaterial(req: Request, res: Response) {
  try {
    const id = req.params.id as string | undefined;
    const userId = req.userId; // Get userId for authorization check
    if (!id) return res.status(400).json({ message: "id required" });
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const material = await prisma.rawMaterial.findFirst({
      where: { id, userId }, // Ensure the user owns this material
    });

    if (!material)
      return res
        .status(404)
        .json({ message: "Raw material not found or access denied" });
    return res.json(material);
  } catch (err) {
    console.error("getRawMaterial:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** Delete raw material and trigger recalculation of dependent product costs */
export async function deleteRawMaterial(req: Request, res: Response) {
  try {
    const id = req.params.id as string | undefined;
    const userId = req.userId; // <-- Use req.userId here
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!id) return res.status(400).json({ message: "id required" });

    // Important: First trigger recalculation *before* deleting the material or its links.
    // The recalculate function needs the existing links to find affected products.
    // We pass a special flag or handle the deletion logic within recalculate if needed,
    // but a simpler approach is to recalculate first based on existing links.
    // However, recalculating *after* deletion might be complex as the rawMaterial record is gone.
    // Let's recalculate product costs *assuming* this material is removed.
    // Fetch products linked *before* deletion
    const linkedIngredients = await prisma.productIngredient.findMany({
      where: { rawMaterialId: id, product: { userId: userId } },
      select: { productId: true },
    });
    const affectedProductIds = [
      ...new Set(linkedIngredients.map((ing) => ing.productId)),
    ];

    // Use a transaction to ensure atomicity
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Delete ProductIngredient links first due to foreign key constraints
      await tx.productIngredient.deleteMany({
        where: { rawMaterialId: id },
      });

      // Now delete the raw material itself
      const deleteResult = await tx.rawMaterial.deleteMany({
        where: { id, userId }, // Ensure user owns the material
      });

      if (deleteResult.count === 0) {
        throw new Error("Material not found or user unauthorized");
      }

      // Now, recalculate costs for products that USED TO contain the deleted material
      if (affectedProductIds.length > 0) {
        const productUpdates = await Promise.all(
          affectedProductIds.map(async (productId) => {
            const remainingIngredients = await tx.productIngredient.findMany({
              where: { productId: productId },
              include: { rawMaterial: true },
            });

            let newTotalIngredientCost = 0;
            remainingIngredients.forEach((item) => {
              if (item.rawMaterial) {
                const percentage =
                  typeof item.percentage === "number" ? item.percentage : 0;
                const cost =
                  typeof item.rawMaterial.cost === "number"
                    ? item.rawMaterial.cost
                    : 0;
                newTotalIngredientCost += (percentage / 100) * cost;
              }
            });

            const product = await tx.product.findUnique({
              where: { id: productId },
            });
            const additionalCost =
              product && typeof product.additionalCost === "number"
                ? product.additionalCost
                : 0;

            return tx.product.update({
              where: { id: productId },
              data: { totalCost: newTotalIngredientCost + additionalCost },
            });
          })
        );
      }

      return deleteResult; // Return the result of the delete operation
    });

    return res.json({ deleted: transactionResult.count });
  } catch (err: any) {
    if (
      err instanceof Error &&
      err.message === "Material not found or user unauthorized"
    ) {
      return res
        .status(404)
        .json({
          message:
            "Raw material not found or you don't have permission to delete it.",
        });
    }
    if (err.code === "P2025") {
      // Prisma code for record not found during delete
      return res
        .status(404)
        .json({
          message:
            "Raw material not found or you don't have permission to delete it.",
        });
    }
    console.error("deleteRawMaterial:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Export aliases expected by routes.
 * If your routes import createRawMaterialHandler, getRawMaterialsHandler, etc. these aliases satisfy that.
 */
export const createRawMaterialHandler = createRawMaterial;
export const getRawMaterialsHandler = listRawMaterials;
export const updateRawMaterialHandler = updateRawMaterial;
export const deleteRawMaterialHandler = deleteRawMaterial;
// Exporting getRawMaterial handler as well if needed by routes, although it's not currently used in raw-materials.routes.ts
export const getRawMaterialHandler = getRawMaterial;

export default {
  listRawMaterials,
  createRawMaterial,
  updateRawMaterial,
  getRawMaterial,
  deleteRawMaterial,
  recalculateProductCostsForMaterial, // Keep internal helper function exported if needed elsewhere, otherwise remove export
  // Aliases for route handlers
  createRawMaterialHandler,
  getRawMaterialsHandler,
  updateRawMaterialHandler,
  deleteRawMaterialHandler,
  getRawMaterialHandler,
};
