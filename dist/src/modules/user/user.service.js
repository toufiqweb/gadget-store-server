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
exports.updateUserProfile = exports.getUserProfile = exports.getUserStats = void 0;
const collections_1 = require("../../db/collections");
const getUserStats = (userQuery, sixMonthsAgo) => __awaiter(void 0, void 0, void 0, function* () {
    const [totalMyProducts, myProducts] = yield Promise.all([
        collections_1.productsCollection.countDocuments(userQuery),
        collections_1.productsCollection.find(userQuery).sort({ createdAt: -1 }).toArray(),
    ]);
    const myCategoryAgg = yield collections_1.productsCollection.aggregate([
        { $match: userQuery },
        { $group: { _id: "$category", count: { $sum: 1 } } },
    ]).toArray();
    const myMonthlyAgg = yield collections_1.productsCollection.aggregate([
        { $match: Object.assign(Object.assign({}, userQuery), { createdAt: { $gte: sixMonthsAgo } }) },
        {
            $group: {
                _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]).toArray();
    return { totalMyProducts, myProducts, myCategoryAgg, myMonthlyAgg };
});
exports.getUserStats = getUserStats;
const getUserProfile = (userIdentifier, userEmail) => __awaiter(void 0, void 0, void 0, function* () {
    return yield collections_1.usersCollection.findOne({
        $or: [
            { _id: userIdentifier },
            { id: userIdentifier },
            { email: userEmail || userIdentifier }
        ]
    });
});
exports.getUserProfile = getUserProfile;
const updateUserProfile = (userIdentifier, userEmail, updateDoc) => __awaiter(void 0, void 0, void 0, function* () {
    let result = yield collections_1.usersCollection.updateOne({ _id: userIdentifier }, updateDoc);
    if (result.matchedCount === 0) {
        result = yield collections_1.usersCollection.updateOne({ email: (userEmail || userIdentifier) }, updateDoc);
    }
    return result;
});
exports.updateUserProfile = updateUserProfile;
