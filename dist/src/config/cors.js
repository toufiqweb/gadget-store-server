"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsConfig = void 0;
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./env");
exports.corsConfig = (0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        env_1.env.CLIENT_URL
    ],
    credentials: true,
});
