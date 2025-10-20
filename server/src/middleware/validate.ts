import { type Request, type Response, type NextFunction } from "express";
import { type AnyZodObject } from "zod";

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error: any) {
      const errorMessages = error.errors.map((e: any) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(400).json({ errors: errorMessages });
    }
  };
