// server/src/modules/products/products.controller.ts
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Handlers for products routes.
 *
 * NOTE:
 * - We intentionally use (req as any).user to avoid TypeScript errors when your auth middleware
 *   attaches `user` to the request object.
 * - Expose aliases such as getProductsHandler/createProductHandler to match your routes file.
 */

export async function listProducts(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const products = await prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(products);
  } catch (err) {
    console.error("listProducts:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function bulkUpdateProducts(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const body = req.body as any;
    if (!Array.isArray(body?.products)) {
      return res.status(400).json({ message: "products array is required" });
    }

    const products: Array<any> = body.products;

    // Validate ids and prepare synchronous payloads
    const payloads = products.map((p) => {
      if (!p?.id || typeof p.id !== "string") {
        throw new Error("Each product must have a string id");
      }
      const data: any = {};
      if (typeof p.additionalCost === "number")
        data.additionalCost = p.additionalCost;
      if (typeof p.totalCost === "number") data.totalCost = p.totalCost;
      if (typeof p.name === "string") data.name = p.name;
      return { id: p.id, data };
    });

    // Build PrismaPromises (do not use async callbacks here)
    const prismaUpdates = payloads.map((pl) =>
      prisma.product.update({
        where: { id: pl.id },
        data: pl.data,
      })
    );

    const updated = await prisma.$transaction(prismaUpdates);

    return res.json({ updatedCount: updated.length, updated });
  } catch (err: any) {
    console.error("bulkUpdateProducts:", err);
    if (err?.message && err.message.includes("Each product must have")) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete product(s).
 * - If req.params.id exists -> delete that product for the user.
 * - If not -> delete all products for the user (use with caution).
 */
export async function deleteProductHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string | undefined;
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const where: any = { userId };
    if (id) where.id = id;

    const result = await prisma.product.deleteMany({ where });

    return res.json({ deleted: result.count });
  } catch (err) {
    console.error("deleteProductHandler:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, additionalCost = 0, totalCost = 0 } = req.body as any;
    if (!name || typeof name !== "string")
      return res.status(400).json({ message: "name required" });

    const created = await prisma.product.create({
      data: {
        name,
        userId,
        additionalCost,
        totalCost,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("createProduct:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Export aliases expected by routes. Keep original function names too.
 * Your routes can import createProductHandler / getProductsHandler etc.
 */
export const getProductsHandler = listProducts;
export const createProductHandler = createProduct;
export const updateProductsHandler = bulkUpdateProducts;

export default {
  listProducts,
  bulkUpdateProducts,
  deleteProductHandler,
  createProduct,
  getProductsHandler,
  createProductHandler,
  updateProductsHandler,
};
