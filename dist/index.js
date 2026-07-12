"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const jose_cjs_1 = require("jose-cjs");
dotenv_1.default.config();
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const JWKS = (0, jose_cjs_1.createRemoteJWKSet)(
  new URL(`${clientUrl}/api/auth/jwks`),
);
const verifyToken = (req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ msg: "Unauthorized: Missing or malformed header" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ msg: "Unauthorized: No token provided" });
    }
    try {
      const { payload } = yield (0, jose_cjs_1.jwtVerify)(token, JWKS);
      req.user = payload;
      next();
    } catch (error) {
      console.error("JWT Verification Error:", error);
      return res.status(401).json({ msg: "Unauthorized: Invalid token" });
    }
  });
const verifyAdmin = (req, res, next) => {
  var _a;
  if (
    ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin"
  ) {
    return res
      .status(403)
      .json({ success: false, message: "Forbidden: Admin access required" });
  }
  next();
};
const checkBlocked = (req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
      const userIdentifier =
        ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) ||
        ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
      if (!userIdentifier) {
        return res
          .status(401)
          .json({
            success: false,
            message: "Unauthorized: Missing user identifier",
          });
      }
      const user = yield usersCollection.findOne({
        $or: [
          { _id: userIdentifier },
          { id: userIdentifier },
          {
            email:
              ((_c = req.user) === null || _c === void 0 ? void 0 : _c.email) ||
              userIdentifier,
          },
        ],
      });
      if (user && user.status === "blocked") {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Forbidden: Your account has been blocked and you cannot perform mutations.",
          });
      }
      next();
    } catch (error) {
      console.error("Error in checkBlocked middleware:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use(
  (0, cors_1.default)({
    origin: ["http://localhost:3000", clientUrl],
    credentials: true,
  }),
);
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
  },
});
const db = client.db("GadgetsStore");
const productsCollection = db.collection("products");
const usersCollection = db.collection("user");
function run() {
  return __awaiter(this, void 0, void 0, function* () {
    try {
      // Connect the client to the server
      yield client.connect();
      // Send a ping to confirm a successful connection
      yield client.db("admin").command({ ping: 1 });
      console.log(
        "Pinged your deployment. You successfully connected to MongoDB!",
      );
      if (db) {
        // ──────────────────────────────────────────────────────────────
        // GET /api/admin/stats  — Admin dashboard analytics
        // ──────────────────────────────────────────────────────────────
        app.get("/api/admin/stats", verifyToken, verifyAdmin, (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            try {
              const [totalProducts, totalUsers, blockedUsers, adminUsers] =
                yield Promise.all([
                  productsCollection.countDocuments(),
                  usersCollection.countDocuments(),
                  usersCollection.countDocuments({ status: "blocked" }),
                  usersCollection.countDocuments({ role: "admin" }),
                ]);
              // Products by category
              const categoryAgg = yield productsCollection
                .aggregate([
                  { $group: { _id: "$category", count: { $sum: 1 } } },
                  { $sort: { count: -1 } },
                  { $limit: 8 },
                ])
                .toArray();
              // Products added per month (last 6 months)
              const sixMonthsAgo = new Date();
              sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
              const monthlyProductsAgg = yield productsCollection
                .aggregate([
                  { $match: { createdAt: { $gte: sixMonthsAgo } } },
                  {
                    $group: {
                      _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                      },
                      count: { $sum: 1 },
                    },
                  },
                  { $sort: { "_id.year": 1, "_id.month": 1 } },
                ])
                .toArray();
              // Average price by category
              const avgPriceAgg = yield productsCollection
                .aggregate([
                  {
                    $group: { _id: "$category", avgPrice: { $avg: "$price" } },
                  },
                  { $sort: { avgPrice: -1 } },
                  { $limit: 6 },
                ])
                .toArray();
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];
              const monthlyProducts = monthlyProductsAgg.map((m) => ({
                month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
                products: m.count,
              }));
              res.status(200).json({
                success: true,
                data: {
                  totalProducts,
                  totalUsers,
                  blockedUsers,
                  adminUsers,
                  activeUsers: totalUsers - blockedUsers,
                  categoryBreakdown: categoryAgg.map((c) => ({
                    name: c._id || "Uncategorized",
                    value: c.count,
                  })),
                  monthlyProducts,
                  avgPriceByCategory: avgPriceAgg.map((c) => ({
                    name: c._id || "Uncategorized",
                    avgPrice: Math.round(c.avgPrice || 0),
                  })),
                },
              });
            } catch (error) {
              console.error("Error fetching admin stats:", error);
              res
                .status(500)
                .json({
                  success: false,
                  message: "Failed to fetch admin stats",
                });
            }
          }),
        );
        // ──────────────────────────────────────────────────────────────
        // GET /api/users/stats  — User dashboard analytics
        // ──────────────────────────────────────────────────────────────
        app.get("/api/users/stats", verifyToken, (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
              const userIdentifier =
                ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) ||
                ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
              if (!userIdentifier) {
                return res
                  .status(401)
                  .json({ success: false, message: "Unauthorized" });
              }
              const userQuery = {
                $or: [
                  { createdBy: userIdentifier },
                  { userId: userIdentifier },
                ],
              };
              const [totalMyProducts, myProducts] = yield Promise.all([
                productsCollection.countDocuments(userQuery),
                productsCollection
                  .find(userQuery)
                  .sort({ createdAt: -1 })
                  .toArray(),
              ]);
              // Products by category
              const myCategoryAgg = yield productsCollection
                .aggregate([
                  { $match: userQuery },
                  { $group: { _id: "$category", count: { $sum: 1 } } },
                ])
                .toArray();
              // Products added per month (last 6 months)
              const sixMonthsAgo = new Date();
              sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
              const myMonthlyAgg = yield productsCollection
                .aggregate([
                  {
                    $match: Object.assign(Object.assign({}, userQuery), {
                      createdAt: { $gte: sixMonthsAgo },
                    }),
                  },
                  {
                    $group: {
                      _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                      },
                      count: { $sum: 1 },
                    },
                  },
                  { $sort: { "_id.year": 1, "_id.month": 1 } },
                ])
                .toArray();
              const totalStockValue = myProducts.reduce(
                (sum, p) => sum + Number(p.price) * Number(p.stock || 0),
                0,
              );
              const avgRating = myProducts.length
                ? myProducts.reduce(
                    (sum, p) => sum + Number(p.rating || 0),
                    0,
                  ) / myProducts.length
                : 0;
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];
              const monthlyProducts = myMonthlyAgg.map((m) => ({
                month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
                products: m.count,
              }));
              res.status(200).json({
                success: true,
                data: {
                  totalMyProducts,
                  totalStockValue: Math.round(totalStockValue),
                  avgRating: parseFloat(avgRating.toFixed(1)),
                  categoryBreakdown: myCategoryAgg.map((c) => ({
                    name: c._id || "Uncategorized",
                    value: c.count,
                  })),
                  monthlyProducts,
                  recentProducts: myProducts.slice(0, 5).map((p) => ({
                    _id: p._id,
                    title: p.title,
                    category: p.category,
                    price: p.price,
                    stock: p.stock,
                    rating: p.rating,
                    thumbnail: p.thumbnail,
                    createdAt: p.createdAt,
                  })),
                },
              });
            } catch (error) {
              console.error("Error fetching user stats:", error);
              res
                .status(500)
                .json({
                  success: false,
                  message: "Failed to fetch user stats",
                });
            }
          }),
        );
        app.post("/api/products", verifyToken, checkBlocked, (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
              const {
                title,
                brand,
                category,
                shortDescription,
                fullDescription,
                price,
                rating,
                stock,
                thumbnail,
                images,
                specifications,
              } = req.body;
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
                createdBy:
                  ((_a = req.user) === null || _a === void 0
                    ? void 0
                    : _a.id) ||
                  ((_b = req.user) === null || _b === void 0
                    ? void 0
                    : _b.email), // From verifyToken payload
                userId:
                  ((_c = req.user) === null || _c === void 0
                    ? void 0
                    : _c.id) ||
                  ((_d = req.user) === null || _d === void 0
                    ? void 0
                    : _d.email), // Explicitly match user request
                createdAt: new Date(),
              };
              const result = yield productsCollection.insertOne(newProduct);
              res
                .status(201)
                .json({
                  success: true,
                  message: "Product created successfully",
                  data: result,
                });
            } catch (error) {
              console.error("Error creating product:", error);
              res
                .status(500)
                .json({ success: false, message: "Failed to create product" });
            }
          }),
        );
        app.get("/api/products", (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
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
                  { title: { $regex: search, $options: "i" } },
                  { brand: { $regex: search, $options: "i" } },
                ];
              }
              if (category) {
                query.category = category;
              }
              if (brands) {
                const brandArray = brands.split(",").map((b) => b.trim());
                query.brand = { $in: brandArray };
              }
              if (minPrice || maxPrice) {
                query.price = {};
                if (minPrice) query.price.$gte = Number(minPrice);
                if (maxPrice) query.price.$lte = Number(maxPrice);
              }
              // Build sort object
              let sortOption = { createdAt: -1 }; // newest by default
              if (sort === "newest") sortOption = { createdAt: -1 };
              if (sort === "oldest") sortOption = { createdAt: 1 };
              if (sort === "price_asc" || sort === "price-asc")
                sortOption = { price: 1 };
              if (sort === "price_desc" || sort === "price-desc")
                sortOption = { price: -1 };
              if (sort === "rating_asc") sortOption = { rating: 1 };
              if (sort === "rating_desc" || sort === "rating")
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
                  totalPages: Math.ceil(total / limit),
                },
              });
            } catch (error) {
              console.error("Error fetching products:", error);
              res
                .status(500)
                .json({ success: false, message: "Failed to fetch products" });
            }
          }),
        );
        app.get("/api/admin/products", verifyToken, verifyAdmin, (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            try {
              const page = parseInt(req.query.page) || 1;
              const limit = parseInt(req.query.limit) || 10;
              const skip = (page - 1) * limit;
              const search = req.query.search;
              const query = {};
              if (search) {
                query.$or = [
                  { title: { $regex: search, $options: "i" } },
                  { brand: { $regex: search, $options: "i" } },
                  { category: { $regex: search, $options: "i" } },
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
                  totalPages: Math.ceil(total / limit),
                },
              });
            } catch (error) {
              console.error("Error fetching admin products:", error);
              res
                .status(500)
                .json({
                  success: false,
                  message: "Failed to fetch admin products",
                });
            }
          }),
        );
        app.get("/api/products/user/my-products", verifyToken, (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
              const userIdentifier =
                ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) ||
                ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
              if (!userIdentifier) {
                return res
                  .status(401)
                  .json({
                    success: false,
                    message: "Unauthorized: Missing user identifier",
                  });
              }
              // Find products where createdBy or userId matches the current user
              const query = {
                $or: [
                  { createdBy: userIdentifier },
                  { userId: userIdentifier },
                ],
              };
              const products = yield productsCollection
                .find(query)
                .sort({ createdAt: -1 })
                .toArray();
              res.status(200).json({
                success: true,
                data: products,
              });
            } catch (error) {
              console.error("Error fetching my products:", error);
              res
                .status(500)
                .json({
                  success: false,
                  message: "Failed to fetch user products",
                });
            }
          }),
        );
        app.get("/api/products/:id", (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            try {
              const id = req.params.id;
              if (!mongodb_1.ObjectId.isValid(id)) {
                return res
                  .status(400)
                  .json({
                    success: false,
                    message: "Invalid product ID format",
                  });
              }
              const product = yield productsCollection.findOne({
                _id: new mongodb_1.ObjectId(id),
              });
              if (!product) {
                return res
                  .status(404)
                  .json({ success: false, message: "Product not found" });
              }
              res.status(200).json({ success: true, data: product });
            } catch (error) {
              console.error("Error fetching product by ID:", error);
              res
                .status(500)
                .json({ success: false, message: "Failed to fetch product" });
            }
          }),
        );
        app.patch("/api/products/:id", verifyToken, checkBlocked, (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
              const id = req.params.id;
              if (!mongodb_1.ObjectId.isValid(id)) {
                return res
                  .status(400)
                  .json({
                    success: false,
                    message: "Invalid product ID format",
                  });
              }
              const product = yield productsCollection.findOne({
                _id: new mongodb_1.ObjectId(id),
              });
              if (!product) {
                return res
                  .status(404)
                  .json({ success: false, message: "Product not found" });
              }
              const userIdentifier =
                ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) ||
                ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
              const isAdmin =
                ((_c = req.user) === null || _c === void 0
                  ? void 0
                  : _c.role) === "admin";
              if (
                product.userId !== userIdentifier &&
                product.createdBy !== userIdentifier &&
                !isAdmin
              ) {
                return res
                  .status(403)
                  .json({
                    success: false,
                    message: "Forbidden: You cannot modify this product",
                  });
              }
              const {
                title,
                brand,
                category,
                shortDescription,
                fullDescription,
                price,
                rating,
                stock,
                thumbnail,
                images,
                specifications,
              } = req.body;
              const updateDoc = { $set: {} };
              if (title !== undefined) updateDoc.$set.title = title;
              if (brand !== undefined) updateDoc.$set.brand = brand;
              if (category !== undefined) updateDoc.$set.category = category;
              if (shortDescription !== undefined)
                updateDoc.$set.shortDescription = shortDescription;
              if (fullDescription !== undefined)
                updateDoc.$set.fullDescription = fullDescription;
              if (price !== undefined) updateDoc.$set.price = Number(price);
              if (rating !== undefined) updateDoc.$set.rating = Number(rating);
              if (stock !== undefined) updateDoc.$set.stock = Number(stock);
              if (thumbnail !== undefined) updateDoc.$set.thumbnail = thumbnail;
              if (images !== undefined)
                updateDoc.$set.images = Array.isArray(images) ? images : [];
              if (specifications !== undefined)
                updateDoc.$set.specifications = specifications;
              updateDoc.$set.updatedAt = new Date();
              const result = yield productsCollection.updateOne(
                { _id: new mongodb_1.ObjectId(id) },
                updateDoc,
              );
              res
                .status(200)
                .json({
                  success: true,
                  message: "Product updated successfully",
                  data: result,
                });
            } catch (error) {
              console.error("Error updating product:", error);
              res
                .status(500)
                .json({ success: false, message: "Failed to update product" });
            }
          }),
        );
        app.delete("/api/products/:id", verifyToken, checkBlocked, (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
              const id = req.params.id;
              if (!mongodb_1.ObjectId.isValid(id)) {
                return res
                  .status(400)
                  .json({
                    success: false,
                    message: "Invalid product ID format",
                  });
              }
              const product = yield productsCollection.findOne({
                _id: new mongodb_1.ObjectId(id),
              });
              if (!product) {
                return res
                  .status(404)
                  .json({ success: false, message: "Product not found" });
              }
              const userIdentifier =
                ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) ||
                ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
              const isAdmin =
                ((_c = req.user) === null || _c === void 0
                  ? void 0
                  : _c.role) === "admin";
              if (
                product.userId !== userIdentifier &&
                product.createdBy !== userIdentifier &&
                !isAdmin
              ) {
                return res
                  .status(403)
                  .json({
                    success: false,
                    message: "Forbidden: You cannot delete this product",
                  });
              }
              const result = yield productsCollection.deleteOne({
                _id: new mongodb_1.ObjectId(id),
              });
              res
                .status(200)
                .json({
                  success: true,
                  message: "Product deleted successfully",
                  data: result,
                });
            } catch (error) {
              console.error("Error deleting product:", error);
              res
                .status(500)
                .json({ success: false, message: "Failed to delete product" });
            }
          }),
        );
        // GET /api/admin/users
        app.get("/api/admin/users", verifyToken, verifyAdmin, (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            try {
              const page = parseInt(req.query.page) || 1;
              const limit = parseInt(req.query.limit) || 10;
              const skip = (page - 1) * limit;
              const search = req.query.search;
              const query = {};
              if (search) {
                query.$or = [
                  { name: { $regex: search, $options: "i" } },
                  { email: { $regex: search, $options: "i" } },
                ];
              }
              const total = yield usersCollection.countDocuments(query);
              const users = yield usersCollection
                .find(query)
                .skip(skip)
                .limit(limit)
                .toArray();
              res.status(200).json({
                success: true,
                data: users,
                meta: {
                  total,
                  page,
                  limit,
                  totalPages: Math.ceil(total / limit),
                },
              });
            } catch (error) {
              console.error("Error fetching admin users:", error);
              res
                .status(500)
                .json({ success: false, message: "Failed to fetch users" });
            }
          }),
        );
        // PATCH /api/admin/users/:id/status
        app.patch(
          "/api/admin/users/:id/status",
          verifyToken,
          verifyAdmin,
          (req, res) =>
            __awaiter(this, void 0, void 0, function* () {
              try {
                const id = req.params.id;
                const { status } = req.body;
                if (status !== "active" && status !== "blocked") {
                  return res
                    .status(400)
                    .json({ success: false, message: "Invalid status value" });
                }
                let result = yield usersCollection.updateOne(
                  { _id: id },
                  { $set: { status, updatedAt: new Date() } },
                );
                if (
                  result.matchedCount === 0 &&
                  mongodb_1.ObjectId.isValid(id)
                ) {
                  result = yield usersCollection.updateOne(
                    { _id: new mongodb_1.ObjectId(id) },
                    { $set: { status, updatedAt: new Date() } },
                  );
                }
                if (result.matchedCount === 0) {
                  return res
                    .status(404)
                    .json({ success: false, message: "User not found" });
                }
                res
                  .status(200)
                  .json({
                    success: true,
                    message: "User status updated successfully",
                  });
              } catch (error) {
                console.error("Error updating user status:", error);
                res
                  .status(500)
                  .json({
                    success: false,
                    message: "Failed to update user status",
                  });
              }
            }),
        );
        // PATCH /api/admin/users/:id/role
        app.patch(
          "/api/admin/users/:id/role",
          verifyToken,
          verifyAdmin,
          (req, res) =>
            __awaiter(this, void 0, void 0, function* () {
              var _a, _b, _c;
              try {
                const id = req.params.id;
                const { role } = req.body;
                if (role !== "user" && role !== "admin") {
                  return res
                    .status(400)
                    .json({ success: false, message: "Invalid role value" });
                }
                const currentUserIdentifier =
                  ((_a = req.user) === null || _a === void 0
                    ? void 0
                    : _a.id) ||
                  ((_b = req.user) === null || _b === void 0
                    ? void 0
                    : _b.email);
                const targetUser = yield usersCollection.findOne({
                  $or: [
                    { _id: id },
                    {
                      _id: mongodb_1.ObjectId.isValid(id)
                        ? new mongodb_1.ObjectId(id)
                        : null,
                    },
                  ],
                });
                if (
                  targetUser &&
                  (targetUser._id === currentUserIdentifier ||
                    targetUser.email ===
                      ((_c = req.user) === null || _c === void 0
                        ? void 0
                        : _c.email)) &&
                  role === "user"
                ) {
                  return res
                    .status(400)
                    .json({
                      success: false,
                      message: "You cannot change your own admin role",
                    });
                }
                let result = yield usersCollection.updateOne(
                  { _id: id },
                  { $set: { role, updatedAt: new Date() } },
                );
                if (
                  result.matchedCount === 0 &&
                  mongodb_1.ObjectId.isValid(id)
                ) {
                  result = yield usersCollection.updateOne(
                    { _id: new mongodb_1.ObjectId(id) },
                    { $set: { role, updatedAt: new Date() } },
                  );
                }
                if (result.matchedCount === 0) {
                  return res
                    .status(404)
                    .json({ success: false, message: "User not found" });
                }
                res
                  .status(200)
                  .json({
                    success: true,
                    message: "User role updated successfully",
                  });
              } catch (error) {
                console.error("Error updating user role:", error);
                res
                  .status(500)
                  .json({
                    success: false,
                    message: "Failed to update user role",
                  });
              }
            }),
        );
        // GET /api/users/profile
        app.get("/api/users/profile", verifyToken, (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
              const userIdentifier =
                ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) ||
                ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
              if (!userIdentifier) {
                return res
                  .status(401)
                  .json({ success: false, message: "Unauthorized" });
              }
              const user = yield usersCollection.findOne({
                $or: [
                  { _id: userIdentifier },
                  { id: userIdentifier },
                  {
                    email:
                      ((_c = req.user) === null || _c === void 0
                        ? void 0
                        : _c.email) || userIdentifier,
                  },
                ],
              });
              if (!user) {
                return res
                  .status(404)
                  .json({ success: false, message: "User not found" });
              }
              res.status(200).json({ success: true, data: user });
            } catch (error) {
              console.error("Error fetching user profile:", error);
              res
                .status(500)
                .json({
                  success: false,
                  message: "Failed to fetch user profile",
                });
            }
          }),
        );
        // PATCH /api/users/profile
        app.patch("/api/users/profile", verifyToken, checkBlocked, (req, res) =>
          __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
              const userIdentifier =
                ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) ||
                ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email);
              if (!userIdentifier) {
                return res
                  .status(401)
                  .json({ success: false, message: "Unauthorized" });
              }
              const { name, image, bio, phoneNumber, location } = req.body;
              const updateDoc = { $set: {} };
              if (name !== undefined) updateDoc.$set.name = name;
              if (image !== undefined) updateDoc.$set.image = image;
              if (bio !== undefined) updateDoc.$set.bio = bio;
              if (phoneNumber !== undefined)
                updateDoc.$set.phoneNumber = phoneNumber;
              if (location !== undefined) updateDoc.$set.location = location;
              updateDoc.$set.updatedAt = new Date();
              let result = yield usersCollection.updateOne(
                { _id: userIdentifier },
                updateDoc,
              );
              if (result.matchedCount === 0) {
                result = yield usersCollection.updateOne(
                  {
                    email:
                      ((_c = req.user) === null || _c === void 0
                        ? void 0
                        : _c.email) || userIdentifier,
                  },
                  updateDoc,
                );
              }
              if (result.matchedCount === 0) {
                return res
                  .status(404)
                  .json({ success: false, message: "User profile not found" });
              }
              const updatedUser = yield usersCollection.findOne({
                $or: [
                  { _id: userIdentifier },
                  {
                    email:
                      ((_d = req.user) === null || _d === void 0
                        ? void 0
                        : _d.email) || userIdentifier,
                  },
                ],
              });
              res
                .status(200)
                .json({
                  success: true,
                  message: "Profile updated successfully",
                  data: updatedUser,
                });
            } catch (error) {
              console.error("Error updating user profile:", error);
              res
                .status(500)
                .json({
                  success: false,
                  message: "Failed to update user profile",
                });
            }
          }),
        );
      }
      // Start Express server ONLY after successful DB connection
      app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    } catch (error) {
      console.error("Failed to connect to MongoDB", error);
      process.exit(1);
    }
    // We do NOT use finally { client.close() } here because we want the connection
    // to stay open for the Express server to use.
  });
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Gadget Store API is running and connected to MongoDB");
});
