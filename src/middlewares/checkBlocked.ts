import { Request, Response, NextFunction } from 'express';
import { usersCollection } from '../db/collections';

export const checkBlocked = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userIdentifier = req.user?.id || req.user?.email;
    if (!userIdentifier) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing user identifier" });
    }
    
    const user = await usersCollection.findOne({
      $or: [
        { _id: userIdentifier },
        { id: userIdentifier },
        { email: req.user?.email || userIdentifier }
      ]
    });
    
    if (user && user.status === "blocked") {
      return res.status(403).json({ success: false, message: "Forbidden: Your account has been blocked and you cannot perform mutations." });
    }
    next();
  } catch (error) {
    console.error("Error in checkBlocked middleware:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
