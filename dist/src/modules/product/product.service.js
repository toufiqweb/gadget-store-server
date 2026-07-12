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
exports.deleteProduct = exports.updateProduct = exports.getProductById = exports.getMyProducts = exports.getProducts = exports.createProduct = void 0;
const mongodb_1 = require("mongodb");
const collections_1 = require("../../db/collections");
const createProduct = (productData) => __awaiter(void 0, void 0, void 0, function* () {
    return yield collections_1.productsCollection.insertOne(productData);
});
exports.createProduct = createProduct;
const getProducts = (query, sortOption, skip, limit) => __awaiter(void 0, void 0, void 0, function* () {
    const total = yield collections_1.productsCollection.countDocuments(query);
    const products = yield collections_1.productsCollection
        .find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .toArray();
    return { total, products };
});
exports.getProducts = getProducts;
const getMyProducts = (userQuery) => __awaiter(void 0, void 0, void 0, function* () {
    return yield collections_1.productsCollection.find(userQuery).sort({ createdAt: -1 }).toArray();
});
exports.getMyProducts = getMyProducts;
const getProductById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield collections_1.productsCollection.findOne({ _id: new mongodb_1.ObjectId(id) });
});
exports.getProductById = getProductById;
const updateProduct = (id, updateDoc) => __awaiter(void 0, void 0, void 0, function* () {
    return yield collections_1.productsCollection.updateOne({ _id: new mongodb_1.ObjectId(id) }, updateDoc);
});
exports.updateProduct = updateProduct;
const deleteProduct = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield collections_1.productsCollection.deleteOne({ _id: new mongodb_1.ObjectId(id) });
});
exports.deleteProduct = deleteProduct;
