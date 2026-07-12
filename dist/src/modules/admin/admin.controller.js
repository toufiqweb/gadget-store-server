"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRole = exports.updateUserStatus = exports.getAdminUsers = exports.getAdminProducts = exports.getAdminStats = void 0;
const AdminService = __importStar(require("./admin.service"));
const getAdminStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { totalProducts, totalUsers, blockedUsers, adminUsers, categoryAgg, monthlyProductsAgg, avgPriceAgg } = yield AdminService.getAdminStats(sixMonthsAgo);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyProducts = monthlyProductsAgg.map((m) => ({
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
                categoryBreakdown: categoryAgg.map((c) => ({ name: c._id || "Uncategorized", value: c.count })),
                monthlyProducts,
                avgPriceByCategory: avgPriceAgg.map((c) => ({
                    name: c._id || "Uncategorized",
                    avgPrice: Math.round(c.avgPrice || 0),
                })),
            },
        });
    }
    catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ success: false, message: "Failed to fetch admin stats" });
    }
});
exports.getAdminStats = getAdminStats;
const getAdminProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }
        const { total, products } = yield AdminService.getAdminProducts(query, skip, limit);
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
    }
    catch (error) {
        console.error("Error fetching admin products:", error);
        res.status(500).json({ success: false, message: "Failed to fetch admin products" });
    }
});
exports.getAdminProducts = getAdminProducts;
const getAdminUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        const { total, users } = yield AdminService.getAdminUsers(query, skip, limit);
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
    }
    catch (error) {
        console.error("Error fetching admin users:", error);
        res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
});
exports.getAdminUsers = getAdminUsers;
const updateUserStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const { status } = req.body;
        if (status !== 'active' && status !== 'blocked') {
            return res.status(400).json({ success: false, message: "Invalid status value" });
        }
        const result = yield AdminService.updateUserStatus(id, status);
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, message: "User status updated successfully" });
    }
    catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ success: false, message: "Failed to update user status" });
    }
});
exports.updateUserStatus = updateUserStatus;
const updateUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const id = req.params.id;
        const { role } = req.body;
        if (role !== 'user' && role !== 'admin') {
            return res.status(400).json({ success: false, message: "Invalid role value" });
        }
        const currentUserIdentifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
        const targetUser = yield AdminService.findUserByIdOrString(id);
        if (targetUser && (targetUser._id === currentUserIdentifier || targetUser.email === ((_c = req.user) === null || _c === void 0 ? void 0 : _c.email)) && role === 'user') {
            return res.status(400).json({ success: false, message: "You cannot change your own admin role" });
        }
        const result = yield AdminService.updateUserRole(id, role);
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, message: "User role updated successfully" });
    }
    catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ success: false, message: "Failed to update user role" });
    }
});
exports.updateUserRole = updateUserRole;
