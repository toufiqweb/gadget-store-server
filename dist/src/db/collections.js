"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersCollection = exports.productsCollection = void 0;
const db_1 = require("../config/db");
exports.productsCollection = db_1.db.collection("products");
exports.usersCollection = db_1.db.collection("user");
