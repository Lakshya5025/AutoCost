import { type Request, type Response, type NextFunction } from "express";

// Extend the Express Request type to include our custom userId property
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware to check if a user is authenticated.
 * It verifies the presence of `userId` in the session.
 * If authenticated, it attaches the userId to the request object for easy access in controllers.
 * If not, it sends a 401 Unauthorized response.
 */
export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.session.userId) {
    // Attach userId to the request object for downstream handlers
    req.userId = req.session.userId;
    next();
  } else {
    res.status(401).json({ message: "Unauthorized. Please log in." });
  }
};
