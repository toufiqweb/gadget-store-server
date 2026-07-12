import { Request, Response } from 'express';
import * as UserService from './user.service';

export const getUserStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const userIdentifier = req.user?.id || req.user?.email;
    if (!userIdentifier) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userQuery = { $or: [{ createdBy: userIdentifier }, { userId: userIdentifier }] };
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { totalMyProducts, myProducts, myCategoryAgg, myMonthlyAgg } = await UserService.getUserStats(userQuery, sixMonthsAgo);

    const totalStockValue = myProducts.reduce((sum: number, p: any) => sum + (Number(p.price) * Number(p.stock || 0)), 0);
    const avgRating = myProducts.length
      ? myProducts.reduce((sum: number, p: any) => sum + Number(p.rating || 0), 0) / myProducts.length
      : 0;

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthlyProducts = myMonthlyAgg.map((m: any) => ({
      month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      products: m.count,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalMyProducts,
        totalStockValue: Math.round(totalStockValue),
        avgRating: parseFloat(avgRating.toFixed(1)),
        categoryBreakdown: myCategoryAgg.map((c: any) => ({ name: c._id || "Uncategorized", value: c.count })),
        monthlyProducts,
        recentProducts: myProducts.slice(0, 5).map((p: any) => ({
          _id: p._id,
          title: p.title,
          category: p.category,
          price: p.price,
          stock: p.stock,
          rating: p.rating,
          thumbnail: p.thumbnail,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user stats" });
  }
};

export const getUserProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const userIdentifier = req.user?.id || req.user?.email;
    if (!userIdentifier) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userEmail = req.user?.email;
    const user = await UserService.getUserProfile(userIdentifier, userEmail);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user profile" });
  }
};

export const updateUserProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const userIdentifier = req.user?.id || req.user?.email;
    if (!userIdentifier) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, image, bio, phoneNumber, location } = req.body;

    const updateDoc: any = { $set: {} };
    if (name !== undefined) updateDoc.$set.name = name;
    if (image !== undefined) updateDoc.$set.image = image;
    if (bio !== undefined) updateDoc.$set.bio = bio;
    if (phoneNumber !== undefined) updateDoc.$set.phoneNumber = phoneNumber;
    if (location !== undefined) updateDoc.$set.location = location;
    updateDoc.$set.updatedAt = new Date();

    const userEmail = req.user?.email;
    const result = await UserService.updateUserProfile(userIdentifier, userEmail, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User profile not found" });
    }

    const updatedUser = await UserService.getUserProfile(userIdentifier, userEmail);

    res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedUser });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ success: false, message: "Failed to update user profile" });
  }
};
