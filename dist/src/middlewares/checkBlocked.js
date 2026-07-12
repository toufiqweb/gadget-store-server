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
exports.checkBlocked = void 0;
const collections_1 = require("../db/collections");
const checkBlocked = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userIdentifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
        if (!userIdentifier) {
            return res.status(401).json({ success: false, message: "Unauthorized: Missing user identifier" });
        }
        const user = yield collections_1.usersCollection.findOne({
            $or: [
                { _id: userIdentifier },
                { id: userIdentifier },
                { email: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.email) || userIdentifier }
            ]
        });
        if (user && user.status === "blocked") {
            return res.status(403).json({ success: false, message: "Forbidden: Your account has been blocked and you cannot perform mutations." });
        }
        next();
    }
    catch (error) {
        console.error("Error in checkBlocked middleware:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.checkBlocked = checkBlocked;
