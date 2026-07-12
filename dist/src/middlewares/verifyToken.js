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
exports.verifyToken = void 0;
const jose_cjs_1 = require("jose-cjs");
const env_1 = require("../config/env");
const JWKS = (0, jose_cjs_1.createRemoteJWKSet)(new URL(`${env_1.env.CLIENT_URL}/api/auth/jwks`));
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ msg: "Unauthorized: Missing or malformed header" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ msg: "Unauthorized: No token provided" });
    }
    try {
        const { payload } = yield (0, jose_cjs_1.jwtVerify)(token, JWKS);
        req.user = payload;
        next();
    }
    catch (error) {
        console.error("JWT Verification Error:", error);
        return res.status(401).json({ msg: "Unauthorized: Invalid token" });
    }
});
exports.verifyToken = verifyToken;
