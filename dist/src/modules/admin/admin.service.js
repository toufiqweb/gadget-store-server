"use strict";
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
exports.updateUserRole = exports.findUserByIdOrString = exports.updateUserStatus = exports.getAdminUsers = exports.getAdminProducts = exports.getAdminStats = void 0;
const mongodb_1 = require("mongodb");
const collections_1 = require("../../db/collections");
const getAdminStats = (sixMonthsAgo) => __awaiter(void 0, void 0, void 0, function* () {
    const [totalProducts, totalUsers, blockedUsers, adminUsers] = yield Promise.all([
        collections_1.productsCollection.countDocuments(),
        collections_1.usersCollection.countDocuments(),
        collections_1.usersCollection.countDocuments({ status: "blocked" }),
        collections_1.usersCollection.countDocuments({ role: "admin" }),
    ]);
    const categoryAgg = yield collections_1.productsCollection.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
    ]).toArray();
    const monthlyProductsAgg = yield collections_1.productsCollection.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]).toArray();
    const avgPriceAgg = yield collections_1.productsCollection.aggregate([
        { $group: { _id: "$category", avgPrice: { $avg: "$price" } } },
        { $sort: { avgPrice: -1 } },
        { $limit: 6 },
    ]).toArray();
    return { totalProducts, totalUsers, blockedUsers, adminUsers, categoryAgg, monthlyProductsAgg, avgPriceAgg };
});
exports.getAdminStats = getAdminStats;
const getAdminProducts = (query, skip, limit) => __awaiter(void 0, void 0, void 0, function* () {
    const total = yield collections_1.productsCollection.countDocuments(query);
    const products = yield collections_1.productsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
    return { total, products };
});
exports.getAdminProducts = getAdminProducts;
const getAdminUsers = (query, skip, limit) => __awaiter(void 0, void 0, void 0, function* () {
    const total = yield collections_1.usersCollection.countDocuments(query);
    const users = yield collections_1.usersCollection
        .find(query)
        .skip(skip)
        .limit(limit)
        .toArray();
    return { total, users };
});
exports.getAdminUsers = getAdminUsers;
const updateUserStatus = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    let result = yield collections_1.usersCollection.updateOne({ _id: id }, { $set: { status, updatedAt: new Date() } });
    if (result.matchedCount === 0 && mongodb_1.ObjectId.isValid(id)) {
        result = yield collections_1.usersCollection.updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: { status, updatedAt: new Date() } });
    }
    return result;
});
exports.updateUserStatus = updateUserStatus;
const findUserByIdOrString = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield collections_1.usersCollection.findOne({
        $or: [{ _id: id }, { _id: (mongodb_1.ObjectId.isValid(id) ? new mongodb_1.ObjectId(id) : null) }]
    });
});
exports.findUserByIdOrString = findUserByIdOrString;
const updateUserRole = (id, role) => __awaiter(void 0, void 0, void 0, function* () {
    let result = yield collections_1.usersCollection.updateOne({ _id: id }, { $set: { role, updatedAt: new Date() } });
    if (result.matchedCount === 0 && mongodb_1.ObjectId.isValid(id)) {
        result = yield collections_1.usersCollection.updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: { role, updatedAt: new Date() } });
    }
    return result;
});
exports.updateUserRole = updateUserRole;
