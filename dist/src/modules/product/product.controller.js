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
exports.deleteProduct = exports.updateProduct = exports.getProductById = exports.getMyProducts = exports.getProducts = exports.createProduct = void 0;
const mongodb_1 = require("mongodb");
const ProductService = __importStar(require("./product.service"));
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { title, brand, category, shortDescription, fullDescription, price, rating, stock, thumbnail, images, specifications } = req.body;
        const newProduct = {
            title,
            brand,
            category,
            shortDescription,
            fullDescription,
            price: Number(price),
            rating: Number(rating) || 0,
            stock: Number(stock),
            thumbnail,
            images: Array.isArray(images) ? images : [],
            specifications,
            createdBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email),
            userId: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id) || ((_d = req.user) === null || _d === void 0 ? void 0 : _d.email),
            createdAt: new Date()
        };
        const result = yield ProductService.createProduct(newProduct);
        res.status(201).json({ success: true, message: "Product created successfully", data: result });
    }
    catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ success: false, message: "Failed to create product" });
    }
});
exports.createProduct = createProduct;
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const category = req.query.category;
        const brands = req.query.brands;
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;
        const rating = req.query.rating;
        const inStock = req.query.inStock;
        const sort = req.query.sort;
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) {
            query.category = category;
        }
        if (brands) {
            const brandArray = brands.split(',').map(b => b.trim());
            query.brand = { $in: brandArray };
        }
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice)
                query.price.$gte = Number(minPrice);
            if (maxPrice)
                query.price.$lte = Number(maxPrice);
        }
        if (rating) {
            query.rating = { $gte: Number(rating) };
        }
        if (inStock === 'true') {
            query.stock = { $gt: 0 };
        }
        let sortOption = { createdAt: -1 };
        if (sort === 'newest')
            sortOption = { createdAt: -1 };
        if (sort === 'oldest')
            sortOption = { createdAt: 1 };
        if (sort === 'price_asc' || sort === 'price-asc')
            sortOption = { price: 1 };
        if (sort === 'price_desc' || sort === 'price-desc')
            sortOption = { price: -1 };
        if (sort === 'rating_asc')
            sortOption = { rating: 1 };
        if (sort === 'rating_desc' || sort === 'rating')
            sortOption = { rating: -1 };
        if (sort === 'name_asc')
            sortOption = { title: 1 };
        if (sort === 'name_desc')
            sortOption = { title: -1 };
        const { total, products } = yield ProductService.getProducts(query, sortOption, skip, limit);
        res.status(200).json({
            success: true,
            data: products,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
});
exports.getProducts = getProducts;
const getMyProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userIdentifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
        if (!userIdentifier) {
            return res.status(401).json({ success: false, message: "Unauthorized: Missing user identifier" });
        }
        const query = {
            $or: [
                { createdBy: userIdentifier },
                { userId: userIdentifier }
            ]
        };
        const products = yield ProductService.getMyProducts(query);
        res.status(200).json({
            success: true,
            data: products
        });
    }
    catch (error) {
        console.error("Error fetching my products:", error);
        res.status(500).json({ success: false, message: "Failed to fetch user products" });
    }
});
exports.getMyProducts = getMyProducts;
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        if (!mongodb_1.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid product ID format" });
        }
        const product = yield ProductService.getProductById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, data: product });
    }
    catch (error) {
        console.error("Error fetching product by ID:", error);
        res.status(500).json({ success: false, message: "Failed to fetch product" });
    }
});
exports.getProductById = getProductById;
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const id = req.params.id;
        if (!mongodb_1.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid product ID format" });
        }
        const product = yield ProductService.getProductById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        const userIdentifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
        const isAdmin = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'admin';
        if (product.userId !== userIdentifier && product.createdBy !== userIdentifier && !isAdmin) {
            return res.status(403).json({ success: false, message: "Forbidden: You cannot modify this product" });
        }
        const { title, brand, category, shortDescription, fullDescription, price, rating, stock, thumbnail, images, specifications } = req.body;
        const updateDoc = { $set: {} };
        if (title !== undefined)
            updateDoc.$set.title = title;
        if (brand !== undefined)
            updateDoc.$set.brand = brand;
        if (category !== undefined)
            updateDoc.$set.category = category;
        if (shortDescription !== undefined)
            updateDoc.$set.shortDescription = shortDescription;
        if (fullDescription !== undefined)
            updateDoc.$set.fullDescription = fullDescription;
        if (price !== undefined)
            updateDoc.$set.price = Number(price);
        if (rating !== undefined)
            updateDoc.$set.rating = Number(rating);
        if (stock !== undefined)
            updateDoc.$set.stock = Number(stock);
        if (thumbnail !== undefined)
            updateDoc.$set.thumbnail = thumbnail;
        if (images !== undefined)
            updateDoc.$set.images = Array.isArray(images) ? images : [];
        if (specifications !== undefined)
            updateDoc.$set.specifications = specifications;
        updateDoc.$set.updatedAt = new Date();
        const result = yield ProductService.updateProduct(id, updateDoc);
        res.status(200).json({ success: true, message: "Product updated successfully", data: result });
    }
    catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ success: false, message: "Failed to update product" });
    }
});
exports.updateProduct = updateProduct;
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const id = req.params.id;
        if (!mongodb_1.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid product ID format" });
        }
        const product = yield ProductService.getProductById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        const userIdentifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
        const isAdmin = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'admin';
        if (product.userId !== userIdentifier && product.createdBy !== userIdentifier && !isAdmin) {
            return res.status(403).json({ success: false, message: "Forbidden: You cannot delete this product" });
        }
        const result = yield ProductService.deleteProduct(id);
        res.status(200).json({ success: true, message: "Product deleted successfully", data: result });
    }
    catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ success: false, message: "Failed to delete product" });
    }
});
exports.deleteProduct = deleteProduct;
