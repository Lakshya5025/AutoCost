import { type Request, type Response } from "express";
import prisma from "../../lib/prisma.js";

// Handler to create a new raw material
export const createRawMaterialHandler = async (req: Request, res: Response) => {
  const { name, cost } = req.body;
  const userId = req.userId!; // We know userId exists because of the isAuthenticated middleware

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
      data: {
        name,
        cost,
        userId,
      },
    });
    res.status(201).json(newMaterial);
  } catch (error) {
    console.error("Failed to create raw material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Handler to get all raw materials for the logged-in user
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

// Handler to update a raw material's cost
export const updateRawMaterialHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { cost } = req.body;
  const userId = req.userId!;

  try {
    // updateMany is used to ensure the user can only update their own material
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

    const updatedMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
    });
    res.status(200).json(updatedMaterial);
  } catch (error) {
    console.error("Failed to update raw material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Handler to delete a raw material
export const deleteRawMaterialHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    const result = await prisma.rawMaterial.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return res.status(404).json({
        message:
          "Raw material not found or you do not have permission to delete it.",
      });
    }

    res.status(204).send(); // 204 No Content for successful deletion
  } catch (error) {
    console.error("Failed to delete raw material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
