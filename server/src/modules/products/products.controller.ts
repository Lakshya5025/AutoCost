// server/src/modules/products/products.controller.ts
import type { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client"; // Import Prisma

const prisma = new PrismaClient();

/**
 * Handlers for products routes.
 *
 * NOTE:
 * - We use req.userId (set by isAuthenticated middleware) to get the logged-in user's ID.
 */

export async function listProducts(req: Request, res: Response) {
  try {
    // const userId = (req as any).user?.id as string | undefined; // <-- INCORRECT
    const userId = req.userId; // <-- CORRECT: Use req.userId
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const products = await prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      // --- Add include block ---
      include: {
        ingredients: {
          // Include the related ProductIngredient records
          include: {
            rawMaterial: true, // Include the related RawMaterial for each ingredient
          },
          orderBy: {
            // Optional: Order ingredients if needed, e.g., by name
            rawMaterial: { name: "asc" },
          },
        },
      },
      // --- End include block ---
    });

    // Optional: Recalculate totalCost on the fly if not reliably stored
    // This ensures the frontend always gets the latest calculation
    const productsWithCalculatedCost = await Promise.all(
      products.map(async (product) => {
        let calculatedIngredientCost = 0;
        product.ingredients.forEach((ing) => {
          if (ing.rawMaterial) {
            const percentage =
              typeof ing.percentage === "number" ? ing.percentage : 0;
            const cost =
              typeof ing.rawMaterial.cost === "number"
                ? ing.rawMaterial.cost
                : 0;
            calculatedIngredientCost += (percentage / 100) * cost;
          }
        });
        const additionalCost =
          typeof product.additionalCost === "number"
            ? product.additionalCost
            : 0;
        return {
          ...product,
          totalCost: calculatedIngredientCost + additionalCost, // Override stored totalCost with calculated one
        };
      })
    );

    // return res.json(products); // Return original products if totalCost is trusted
    return res.json(productsWithCalculatedCost); // Return products with recalculated cost
  } catch (err) {
    console.error("listProducts:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// --- createProduct Function ---
export async function createProduct(req: Request, res: Response) {
  try {
    // const userId = (req as any).user?.id as string | undefined; // <-- INCORRECT
    const userId = req.userId; // <-- CORRECT: Use req.userId
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // --- Validation & Calculation ---
    // Type assertion for req.body based on your validation schema (zod) might be cleaner
    const {
      name,
      additionalCost = 0,
      ingredients,
    } = req.body as {
      name: string;
      additionalCost?: number;
      ingredients: Array<{ rawMaterialId: string; percentage: number }>;
    };

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "Product name is required" });
    }
    if (typeof additionalCost !== "number" || additionalCost < 0) {
      return res
        .status(400)
        .json({ message: "Additional cost must be a non-negative number" });
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one ingredient is required" });
    }

    let totalPercentage = 0;
    const ingredientData: Prisma.ProductIngredientCreateManyProductInput[] = [];
    const rawMaterialIds = ingredients.map((ing) => ing.rawMaterialId);

    // Fetch costs of all raw materials involved in one go
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: {
        id: { in: rawMaterialIds },
        userId: userId, // Ensure user owns the raw materials being used
      },
      select: { id: true, cost: true }, // Select only needed fields
    });

    const materialCostsMap = new Map(
      rawMaterials.map((mat) => [mat.id, mat.cost])
    );

    let calculatedIngredientCost = 0;

    for (const ing of ingredients) {
      if (
        !ing.rawMaterialId ||
        typeof ing.percentage !== "number" ||
        ing.percentage <= 0 ||
        ing.percentage > 100
      ) {
        return res.status(400).json({
          message:
            "Each ingredient must have a valid rawMaterialId and a positive percentage up to 100",
        });
      }

      // Check if the raw material exists and belongs to the user
      const materialCost = materialCostsMap.get(ing.rawMaterialId);
      if (materialCost === undefined) {
        return res.status(400).json({
          message: `Raw material with ID ${ing.rawMaterialId} not found or not owned by user.`,
        });
      }

      totalPercentage += ing.percentage;
      calculatedIngredientCost += (ing.percentage / 100) * materialCost;

      ingredientData.push({
        rawMaterialId: ing.rawMaterialId,
        percentage: ing.percentage,
      });
    }

    if (Math.abs(totalPercentage - 100) > 0.01) {
      return res.status(400).json({
        message: `Ingredient percentages must add up to 100%. Current total: ${totalPercentage.toFixed(
          2
        )}%`,
      });
    }

    const totalCost = calculatedIngredientCost + additionalCost;
    // --- End Validation & Calculation ---

    // Check for existing product name for this user
    const existingProduct = await prisma.product.findUnique({
      where: { name_userId: { name, userId } },
    });
    if (existingProduct) {
      return res
        .status(409)
        .json({ message: `Product with name '${name}' already exists.` });
    }

    const created = await prisma.product.create({
      data: {
        name,
        userId,
        additionalCost,
        totalCost, // Store the calculated total cost
        ingredients: {
          createMany: {
            // Use createMany for efficiency
            data: ingredientData,
          },
        },
      },
      // Include ingredients and raw materials in the response
      include: {
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });

    return res.status(201).json(created);
  } catch (err: any) {
    // Prisma unique constraint violation code
    if (
      err.code === "P2002" &&
      err.meta?.target?.includes("name") &&
      err.meta?.target?.includes("userId")
    ) {
      return res.status(409).json({
        message: `Product with name '${req.body.name}' already exists.`,
      });
    }
    console.error("createProduct:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete product(s).
 */
export async function deleteProductHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string | undefined;
    // const userId = (req as any).user?.id as string | undefined; // <-- INCORRECT
    const userId = req.userId; // <-- CORRECT: Use req.userId
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Require ID for deletion, prevent accidental mass deletion
    if (!id) {
      return res
        .status(400)
        .json({ message: "Product ID is required for deletion." });
    }

    // Use transaction to ensure ingredients are deleted with the product
    const transactionResult = await prisma.$transaction(async (tx) => {
      // First delete related ingredients (optional if cascade delete is set up correctly in schema, but explicit is safer)
      await tx.productIngredient.deleteMany({
        where: { productId: id },
      });

      // Then delete the product, ensuring it belongs to the user
      const deleteResult = await tx.product.deleteMany({
        where: { id: id, userId: userId },
      });

      // If no product was deleted (either not found or wrong user), throw error
      if (deleteResult.count === 0) {
        throw new Error("Product not found or user unauthorized");
      }
      return deleteResult;
    });

    return res.json({ deleted: transactionResult.count });
  } catch (err: any) {
    if (
      err instanceof Error &&
      err.message === "Product not found or user unauthorized"
    ) {
      return res.status(404).json({
        message: "Product not found or you don't have permission to delete it.",
      });
    }
    if (err.code === "P2025") {
      // Prisma code for record not found during delete
      return res.status(404).json({
        message: "Product not found or you don't have permission to delete it.",
      });
    }
    console.error("deleteProductHandler:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// NOTE: bulkUpdateProducts handler removed as it wasn't used in products.routes.ts
// If needed, it should also be updated to use req.userId

/**
 * Export aliases expected by routes. Keep original function names too.
 * Your routes can import createProductHandler / getProductsHandler etc.
 */
export const getProductsHandler = listProducts;
export const createProductHandler = createProduct;
// export const updateProductsHandler = bulkUpdateProducts; // Removed alias

export default {
  listProducts,
  // bulkUpdateProducts, // Removed export
  deleteProductHandler,
  createProduct,
  // Aliases
  getProductsHandler,
  createProductHandler,
  // updateProductsHandler, // Removed alias
};
