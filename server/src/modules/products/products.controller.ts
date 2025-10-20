import { type Request, type Response } from "express";
import prisma from "../../lib/prisma.js";

// --- Helper Functions ---

/**
 * Calculates the total cost of a product based on its ingredients and additional costs.
 * @param ingredients - Array of ingredients with rawMaterialId and percentage.
 * @param additionalCost - The fixed additional cost for the product.
 * @param userId - The ID of the user owning the materials.
 * @returns The calculated total cost.
 * @throws Throws an error if a raw material is not found.
 */
const calculateProductCost = async (
  ingredients: { rawMaterialId: string; percentage: number }[],
  additionalCost: number,
  userId: string
): Promise<number> => {
  let totalCost = 0;
  for (const ingredient of ingredients) {
    const rawMaterial = await prisma.rawMaterial.findFirst({
      where: { id: ingredient.rawMaterialId, userId },
    });
    if (!rawMaterial) {
      throw new Error(
        `Raw material with ID ${ingredient.rawMaterialId} not found.`
      );
    }
    // Cost of ingredient = (Cost per Quintal of Raw Material) * (Percentage / 100)
    totalCost += rawMaterial.cost * (ingredient.percentage / 100);
  }
  // Add fixed additional costs
  totalCost += additionalCost;
  return totalCost;
};

/**
 * NEW: Recalculates and updates the totalCost for all products that use a specific raw material.
 * This is triggered when a raw material's price changes.
 * @param rawMaterialId - The ID of the updated raw material.
 * @param userId - The ID of the user who owns the material.
 */
export const recalculateProductCostsForMaterial = async (
  rawMaterialId: string,
  userId: string
): Promise<void> => {
  // Find all products that contain the updated raw material for the specific user
  const productsToUpdate = await prisma.product.findMany({
    where: {
      userId,
      ingredients: {
        some: {
          rawMaterialId,
        },
      },
    },
    include: {
      ingredients: {
        include: {
          rawMaterial: true, // Include raw material data to get costs
        },
      },
    },
  });

  if (productsToUpdate.length === 0) {
    return; // No products to update
  }

  const updatePromises = productsToUpdate.map(async (product) => {
    let newTotalCost = 0;
    for (const ingredient of product.ingredients) {
      newTotalCost +=
        ingredient.rawMaterial.cost * (ingredient.percentage / 100);
    }
    newTotalCost += product.additionalCost;

    return prisma.product.update({
      where: { id: product.id },
      data: { totalCost: newTotalCost },
    });
  });

  // Execute all updates in a single transaction
  await prisma.$transaction(updatePromises);
  console.log(`Recalculated costs for ${productsToUpdate.length} products.`);
};

// --- Route Handlers ---

export const createProductHandler = async (req: Request, res: Response) => {
  const { name, additionalCost, ingredients } = req.body;
  const userId = req.userId!;

  try {
    const totalPercentage = ingredients.reduce(
      (sum: number, i: any) => sum + i.percentage,
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return res.status(400).json({
        message: `Ingredient percentages must add up to 100%. Current sum is ${totalPercentage}%.`,
      });
    }

    const totalCost = await calculateProductCost(
      ingredients,
      additionalCost,
      userId
    );

    const newProduct = await prisma.product.create({
      data: {
        name,
        additionalCost,
        totalCost,
        userId,
        ingredients: {
          create: ingredients.map((ing: any) => ({
            rawMaterialId: ing.rawMaterialId,
            percentage: ing.percentage,
          })),
        },
      },
      include: {
        ingredients: { include: { rawMaterial: true } },
      },
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Failed to create product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getProductsHandler = async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const products = await prisma.product.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: {
        ingredients: {
          orderBy: { rawMaterial: { name: "asc" } },
          include: { rawMaterial: true },
        },
      },
    });
    res.status(200).json(products);
  } catch (error) {
    console.error("Failed to get products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteProductHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;
  try {
    const result = await prisma.product.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      return res
        .status(404)
        .json({
          message:
            "Product not found or you do not have permission to delete it.",
        });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
