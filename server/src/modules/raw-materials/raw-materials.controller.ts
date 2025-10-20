import { type Request, type Response } from "express";
import prisma from "../../lib/prisma.js";
import { recalculateProductCostsForMaterial } from "../products/products.controller.js";

export const createRawMaterialHandler = async (req: Request, res: Response) => {
  const { name, cost } = req.body;
  const userId = req.userId!;

  try {
    const existingMaterial = await prisma.rawMaterial.findFirst({
      where: { name, userId },
    });

    if (existingMaterial) {
      return res
        .status(409)
        .json({ message: "A raw material with this name already exists." });
    }

    const newMaterial = await prisma.rawMaterial.create({
      data: { name, cost, userId },
    });
    res.status(201).json(newMaterial);
  } catch (error) {
    console.error("Failed to create raw material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getRawMaterialsHandler = async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const materials = await prisma.rawMaterial.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
    res.status(200).json(materials);
  } catch (error) {
    console.error("Failed to get raw materials:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateRawMaterialHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { cost } = req.body;
  const userId = req.userId!;

  try {
    const result = await prisma.rawMaterial.updateMany({
      where: { id, userId },
      data: { cost },
    });

    if (result.count === 0) {
      return res.status(404).json({
        message:
          "Raw material not found or you do not have permission to edit it.",
      });
    }

    // --- TRIGGER RECALCULATION ---
    // After updating the cost, recalculate costs for all affected products.
    await recalculateProductCostsForMaterial(id, userId);
    // --- END TRIGGER ---

    const updatedMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
    });
    res.status(200).json(updatedMaterial);
  } catch (error) {
    console.error("Failed to update raw material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteRawMaterialHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    // Check if the material is used in any products
    const usages = await prisma.productIngredient.count({
      where: { rawMaterialId: id },
    });

    if (usages > 0) {
      return res
        .status(400)
        .json({
          message: `Cannot delete. This material is used in ${usages} product(s).`,
        });
    }

    const result = await prisma.rawMaterial.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return res.status(404).json({
        message:
          "Raw material not found or you do not have permission to delete it.",
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete raw material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
