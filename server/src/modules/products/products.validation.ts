import { z } from "zod";

const ingredientSchema = z.object({
  rawMaterialId: z.string({ required_error: "Raw material ID is required" }),
  percentage: z
    .number({ required_error: "Percentage is required" })
    .positive("Percentage must be a positive number")
    .max(100, "Percentage cannot exceed 100"),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Product name is required" })
      .min(1, "Name cannot be empty"),
    additionalCost: z
      .number()
      .nonnegative("Additional cost cannot be negative")
      .default(0),
    ingredients: z
      .array(ingredientSchema)
      .nonempty("At least one ingredient is required"),
  }),
});

export const updateProductSchema = createProductSchema; // For now, updating uses the same logic as creating
