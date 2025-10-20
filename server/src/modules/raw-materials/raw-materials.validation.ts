import { z } from "zod";

// Schema for creating a new raw material
export const createRawMaterialSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Name is required" })
      .min(1, "Name cannot be empty"),
    // Ensure cost is a positive number
    cost: z
      .number({ required_error: "Cost is required" })
      .positive("Cost must be a positive number"),
  }),
});

// Schema for updating a raw material's cost
export const updateRawMaterialSchema = z.object({
  body: z.object({
    cost: z
      .number({ required_error: "Cost is required" })
      .positive("Cost must be a positive number"),
  }),
});
