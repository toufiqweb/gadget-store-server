"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = void 0;
const verifyAdmin = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
    }
    next();
};
exports.verifyAdmin = verifyAdmin;
