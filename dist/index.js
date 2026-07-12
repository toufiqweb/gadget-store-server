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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const jose_cjs_1 = require("jose-cjs");
dotenv_1.default.config();
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const JWKS = (0, jose_cjs_1.createRemoteJWKSet)(new URL(`${clientUrl}/api/auth/jwks`));
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
const verifyAdmin = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
    }
    next();
};
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("MONGODB_URI is not defined in the environment variables.");
    process.exit(1);
}
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new mongodb_1.MongoClient(uri, {
    serverApi: {
        version: mongodb_1.ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Connect the client to the server
            yield client.connect();
            // Send a ping to confirm a successful connection
            yield client.db("admin").command({ ping: 1 });
            console.log("Pinged your deployment. You successfully connected to MongoDB!");
            const db = client ? client.db("GadgetsStore") : null;
            if (db) {
                const productsCollection = db.collection("products");
                app.post('/api/products', verifyToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                            createdBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email), // From verifyToken payload
                            userId: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id) || ((_d = req.user) === null || _d === void 0 ? void 0 : _d.email), // Explicitly match user request
                            createdAt: new Date()
                        };
                        const result = yield productsCollection.insertOne(newProduct);
                        res.status(201).json({ success: true, message: "Product created successfully", data: result });
                    }
                    catch (error) {
                        console.error("Error creating product:", error);
                        res.status(500).json({ success: false, message: "Failed to create product" });
                    }
                }));
                app.get('/api/products', (req, res) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        // Parse basic query parameters for pagination and filtering
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;
                        const search = req.query.search;
                        const category = req.query.category;
                        const brands = req.query.brands;
                        const minPrice = req.query.minPrice;
                        const maxPrice = req.query.maxPrice;
                        const sort = req.query.sort;
                        // Build query object
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
                        // Build sort object
                        let sortOption = { createdAt: -1 }; // newest by default
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
                        // Fetch data
                        const total = yield productsCollection.countDocuments(query);
                        const products = yield productsCollection
                            .find(query)
                            .sort(sortOption)
                            .skip(skip)
                            .limit(limit)
                            .toArray();
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
                }));
                app.get('/api/admin/products', verifyToken, verifyAdmin, (req, res) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;
                        const search = req.query.search;
                        const query = {};
                        if (search) {
                            query.$or = [
                                { title: { $regex: search, $options: 'i' } },
                                { brand: { $regex: search, $options: 'i' } },
                                { category: { $regex: search, $options: 'i' } }
                            ];
                        }
                        const total = yield productsCollection.countDocuments(query);
                        const products = yield productsCollection
                            .find(query)
                            .sort({ createdAt: -1 })
                            .skip(skip)
                            .limit(limit)
                            .toArray();
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
                        console.error("Error fetching admin products:", error);
                        res.status(500).json({ success: false, message: "Failed to fetch admin products" });
                    }
                }));
                app.get('/api/products/user/my-products', verifyToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    try {
                        const userIdentifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
                        if (!userIdentifier) {
                            return res.status(401).json({ success: false, message: "Unauthorized: Missing user identifier" });
                        }
                        // Find products where createdBy or userId matches the current user
                        const query = {
                            $or: [
                                { createdBy: userIdentifier },
                                { userId: userIdentifier }
                            ]
                        };
                        const products = yield productsCollection.find(query).sort({ createdAt: -1 }).toArray();
                        res.status(200).json({
                            success: true,
                            data: products
                        });
                    }
                    catch (error) {
                        console.error("Error fetching my products:", error);
                        res.status(500).json({ success: false, message: "Failed to fetch user products" });
                    }
                }));
                app.get('/api/products/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const id = req.params.id;
                        if (!mongodb_1.ObjectId.isValid(id)) {
                            return res.status(400).json({ success: false, message: "Invalid product ID format" });
                        }
                        const product = yield productsCollection.findOne({ _id: new mongodb_1.ObjectId(id) });
                        if (!product) {
                            return res.status(404).json({ success: false, message: "Product not found" });
                        }
                        res.status(200).json({ success: true, data: product });
                    }
                    catch (error) {
                        console.error("Error fetching product by ID:", error);
                        res.status(500).json({ success: false, message: "Failed to fetch product" });
                    }
                }));
                app.patch('/api/products/:id', verifyToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c;
                    try {
                        const id = req.params.id;
                        if (!mongodb_1.ObjectId.isValid(id)) {
                            return res.status(400).json({ success: false, message: "Invalid product ID format" });
                        }
                        const product = yield productsCollection.findOne({ _id: new mongodb_1.ObjectId(id) });
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
                        const result = yield productsCollection.updateOne({ _id: new mongodb_1.ObjectId(id) }, updateDoc);
                        res.status(200).json({ success: true, message: "Product updated successfully", data: result });
                    }
                    catch (error) {
                        console.error("Error updating product:", error);
                        res.status(500).json({ success: false, message: "Failed to update product" });
                    }
                }));
                app.delete('/api/products/:id', verifyToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c;
                    try {
                        const id = req.params.id;
                        if (!mongodb_1.ObjectId.isValid(id)) {
                            return res.status(400).json({ success: false, message: "Invalid product ID format" });
                        }
                        const product = yield productsCollection.findOne({ _id: new mongodb_1.ObjectId(id) });
                        if (!product) {
                            return res.status(404).json({ success: false, message: "Product not found" });
                        }
                        const userIdentifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
                        const isAdmin = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) === 'admin';
                        if (product.userId !== userIdentifier && product.createdBy !== userIdentifier && !isAdmin) {
                            return res.status(403).json({ success: false, message: "Forbidden: You cannot delete this product" });
                        }
                        const result = yield productsCollection.deleteOne({ _id: new mongodb_1.ObjectId(id) });
                        res.status(200).json({ success: true, message: "Product deleted successfully", data: result });
                    }
                    catch (error) {
                        console.error("Error deleting product:", error);
                        res.status(500).json({ success: false, message: "Failed to delete product" });
                    }
                }));
            }
            // Start Express server ONLY after successful DB connection
            app.listen(port, () => {
                console.log(`Server is running on port ${port}`);
            });
        }
        catch (error) {
            console.error("Failed to connect to MongoDB", error);
            process.exit(1);
        }
        // We do NOT use finally { client.close() } here because we want the connection 
        // to stay open for the Express server to use.
    });
}
run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Gadget Store API is running and connected to MongoDB');
});
// Handle graceful shutdown to close the database connection properly
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Closing MongoDB connection...");
    yield client.close();
    process.exit(0);
}));
