// server/src/modules/raw-materials/raw-materials.controller.ts
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Handlers for raw-materials routes.
 * Notes:
 * - Use (req as any).user to access auth-attached user safely.
 * - Use `cost` (not `price`) when creating/updating raw materials, as your Prisma types expect `cost`.
 * - We cast some Prisma query results to any where the schema-driven type didn't match our assumptions.
 */

/** Recalculate product costs that depend on a raw material */
export async function recalculateProductCostsForMaterial(
  rawMaterialId: string,
  userId: string
) {
  // Fetch productIngredients that reference this raw material
  const ingredients = await prisma.productIngredient.findMany({
    where: { rawMaterialId },
    include: {
      product: true,
      rawMaterial: true,
    },
  });

  // Compute aggregated contributions per product (simple example)
  const productMap = new Map<string, { additionalFromIngredients: number }>();

  for (const ing of ingredients) {
    // Use any casts because generated types may differ by schema
    const qty =
      typeof (ing as any).quantity === "number" ? (ing as any).quantity : 0;
    // your rawMaterial field appears to be "cost" in generated types
    const rawPrice =
      typeof (ing as any).rawMaterial?.cost === "number"
        ? (ing as any).rawMaterial?.cost
        : 0;
    const contribution = qty * rawPrice;
    const pid = (ing as any).productId ?? (ing as any).product?.id;
    if (!pid) continue;
    const existing = productMap.get(pid) ?? { additionalFromIngredients: 0 };
    existing.additionalFromIngredients += contribution;
    productMap.set(pid, existing);
  }

  const updates = Array.from(productMap.entries()).map(
    ([productId, computed]) =>
      prisma.product.update({
        where: { id: productId },
        data: {
          additionalCost: computed.additionalFromIngredients,
          // If you maintain totalCost, compute and set it here as well
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
    const userId = (req as any).user?.id as string | undefined;
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
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, cost = 0 } = req.body as any;
    if (!name || typeof name !== "string")
      return res.status(400).json({ message: "name required" });

    const created = await prisma.rawMaterial.create({
      data: { name, cost, userId },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("createRawMaterial:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** Update a raw material and recalc product costs */
export async function updateRawMaterial(req: Request, res: Response) {
  try {
    const id = req.params.id as string | undefined;
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!id) return res.status(400).json({ message: "id required" });

    const { name, cost } = req.body as any;
    const data: any = {};
    if (typeof name === "string") data.name = name;
    if (typeof cost === "number") data.cost = cost;

    const updated = await prisma.rawMaterial.updateMany({
      where: { id, userId },
      data,
    });

    // Recalculate dependent product costs
    await recalculateProductCostsForMaterial(id, userId);

    return res.json({ updatedCount: updated.count });
  } catch (err) {
    console.error("updateRawMaterial:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** Get raw material by id */
export async function getRawMaterial(req: Request, res: Response) {
  try {
    const id = req.params.id as string | undefined;
    if (!id) return res.status(400).json({ message: "id required" });

    const material = await prisma.rawMaterial.findUnique({ where: { id } });
    if (!material) return res.status(404).json({ message: "Not found" });
    return res.json(material);
  } catch (err) {
    console.error("getRawMaterial:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** Delete raw material and dependent productIngredients */
export async function deleteRawMaterial(req: Request, res: Response) {
  try {
    const id = req.params.id as string | undefined;
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!id) return res.status(400).json({ message: "id required" });

    const deleteResult = await prisma.rawMaterial.deleteMany({
      where: { id, userId },
    });

    // Remove referencing productIngredient rows (if your domain requires)
    await prisma.productIngredient.deleteMany({ where: { rawMaterialId: id } });

    // Recalculate product costs (material removed)
    await recalculateProductCostsForMaterial(id, userId);

    return res.json({ deleted: deleteResult.count });
  } catch (err) {
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

export default {
  listRawMaterials,
  createRawMaterial,
  updateRawMaterial,
  getRawMaterial,
  deleteRawMaterial,
  recalculateProductCostsForMaterial,
  createRawMaterialHandler,
  getRawMaterialsHandler,
  updateRawMaterialHandler,
  deleteRawMaterialHandler,
};
