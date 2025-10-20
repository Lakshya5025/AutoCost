import { type Request, type Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";

// Helper function to calculate product cost
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
    totalCost += rawMaterial.cost * (ingredient.percentage / 100);
  }
  totalCost += additionalCost;
  return totalCost;
};

// Handler to create a new product
export const createProductHandler = async (req: Request, res: Response) => {
  const { name, additionalCost, ingredients } = req.body;
  const userId = req.userId!;

  try {
    // Basic validation for percentage sum
    const totalPercentage = ingredients.reduce(
      (sum: number, i: any) => sum + i.percentage,
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      // Use a tolerance for floating point math
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
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Failed to create product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Handler to get all products for the user
export const getProductsHandler = async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const products = await prisma.product.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: {
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });
    res.status(200).json(products);
  } catch (error) {
    console.error("Failed to get products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Handler to delete a product
export const deleteProductHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    // Using deleteMany to ensure user ownership
    const result = await prisma.product.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return res.status(404).json({
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
