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
exports.updateUserProfile = exports.getUserProfile = exports.getUserStats = void 0;
const UserService = __importStar(require("./user.service"));
const getUserStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userIdentifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
        if (!userIdentifier) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const userQuery = { $or: [{ createdBy: userIdentifier }, { userId: userIdentifier }] };
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { totalMyProducts, myProducts, myCategoryAgg, myMonthlyAgg } = yield UserService.getUserStats(userQuery, sixMonthsAgo);
        const totalStockValue = myProducts.reduce((sum, p) => sum + (Number(p.price) * Number(p.stock || 0)), 0);
        const avgRating = myProducts.length
            ? myProducts.reduce((sum, p) => sum + Number(p.rating || 0), 0) / myProducts.length
            : 0;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyProducts = myMonthlyAgg.map((m) => ({
            month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
            products: m.count,
        }));
        res.status(200).json({
            success: true,
            data: {
                totalMyProducts,
                totalStockValue: Math.round(totalStockValue),
                avgRating: parseFloat(avgRating.toFixed(1)),
                categoryBreakdown: myCategoryAgg.map((c) => ({ name: c._id || "Uncategorized", value: c.count })),
                monthlyProducts,
                recentProducts: myProducts.slice(0, 5).map((p) => ({
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
    }
    catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({ success: false, message: "Failed to fetch user stats" });
    }
});
exports.getUserStats = getUserStats;
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userIdentifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
        if (!userIdentifier) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const userEmail = (_c = req.user) === null || _c === void 0 ? void 0 : _c.email;
        const user = yield UserService.getUserProfile(userIdentifier, userEmail);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ success: false, message: "Failed to fetch user profile" });
    }
});
exports.getUserProfile = getUserProfile;
const updateUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userIdentifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
        if (!userIdentifier) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { name, image, bio, phoneNumber, location } = req.body;
        const updateDoc = { $set: {} };
        if (name !== undefined)
            updateDoc.$set.name = name;
        if (image !== undefined)
            updateDoc.$set.image = image;
        if (bio !== undefined)
            updateDoc.$set.bio = bio;
        if (phoneNumber !== undefined)
            updateDoc.$set.phoneNumber = phoneNumber;
        if (location !== undefined)
            updateDoc.$set.location = location;
        updateDoc.$set.updatedAt = new Date();
        const userEmail = (_c = req.user) === null || _c === void 0 ? void 0 : _c.email;
        const result = yield UserService.updateUserProfile(userIdentifier, userEmail, updateDoc);
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }
        const updatedUser = yield UserService.getUserProfile(userIdentifier, userEmail);
        res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedUser });
    }
    catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ success: false, message: "Failed to update user profile" });
    }
});
exports.updateUserProfile = updateUserProfile;
