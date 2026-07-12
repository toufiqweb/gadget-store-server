"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = require("./config/cors");
const routes_1 = __importDefault(require("./routes"));
const db_1 = require("./config/db");
const app = (0, express_1.default)();
app.use(cors_1.corsConfig);
app.use(express_1.default.json());
// Connect to MongoDB in the background
(0, db_1.connectDB)();
app.use('/api', routes_1.default);
app.get('/', (req, res) => {
    res.send('Gadget Store API is running and connected to MongoDB');
});
exports.default = app;
