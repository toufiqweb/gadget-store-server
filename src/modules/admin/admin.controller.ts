import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import * as AdminService from './admin.service';

export const getAdminStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { totalProducts, totalUsers, blockedUsers, adminUsers, categoryAgg, monthlyProductsAgg, avgPriceAgg } = await AdminService.getAdminStats(sixMonthsAgo);

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthlyProducts = monthlyProductsAgg.map((m: any) => ({
      month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      products: m.count,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalUsers,
        blockedUsers,
        adminUsers,
        activeUsers: totalUsers - blockedUsers,
        categoryBreakdown: categoryAgg.map((c: any) => ({ name: c._id || "Uncategorized", value: c.count })),
        monthlyProducts,
        avgPriceByCategory: avgPriceAgg.map((c: any) => ({
          name: c._id || "Uncategorized",
          avgPrice: Math.round(c.avgPrice || 0),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ success: false, message: "Failed to fetch admin stats" });
  }
};

export const getAdminProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const query: any = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const { total, products } = await AdminService.getAdminProducts(query, skip, limit);

    res.status(200).json({
      success: true,
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching admin products:", error);
    res.status(500).json({ success: false, message: "Failed to fetch admin products" });
  }
};

export const getAdminUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const { total, users } = await AdminService.getAdminUsers(query, skip, limit);

    res.status(200).json({
      success: true,
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

export const updateUserStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (status !== 'active' && status !== 'blocked') {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const result = await AdminService.updateUserStatus(id, status);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User status updated successfully" });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ success: false, message: "Failed to update user status" });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ success: false, message: "Invalid role value" });
    }

    const currentUserIdentifier = req.user?.id || req.user?.email;
    const targetUser = await AdminService.findUserByIdOrString(id);

    if (targetUser && (targetUser._id === currentUserIdentifier || targetUser.email === req.user?.email) && role === 'user') {
      return res.status(400).json({ success: false, message: "You cannot change your own admin role" });
    }

    const result = await AdminService.updateUserRole(id, role);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User role updated successfully" });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ success: false, message: "Failed to update user role" });
  }
};
