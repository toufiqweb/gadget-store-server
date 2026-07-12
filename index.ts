import express, { Request, Response } from 'express';
import cors from 'cors';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { jwtVerify, createRemoteJWKSet } from 'jose-cjs';
import { NextFunction } from 'express';
dotenv.config();

// Extend Express Request to include user payload
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const JWKS = createRemoteJWKSet(new URL(`${clientUrl}/api/auth/jwks`));

const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "Unauthorized: Missing or malformed header" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Unauthorized: No token provided" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(401).json({ msg: "Unauthorized: Invalid token" });
  }
};

const verifyAdmin = (req: Request, res: Response, next: NextFunction): any => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }
  next();
};

const checkBlocked = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userIdentifier = req.user?.id || req.user?.email;
    if (!userIdentifier) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing user identifier" });
    }
    
    const user = await usersCollection.findOne({
      $or: [
        { _id: userIdentifier },
        { id: userIdentifier },
        { email: req.user?.email || userIdentifier }
      ]
    });
    
    if (user && user.status === "blocked") {
      return res.status(403).json({ success: false, message: "Forbidden: Your account has been blocked and you cannot perform mutations." });
    }
    next();
  } catch (error) {
    console.error("Error in checkBlocked middleware:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    "http://localhost:3000",
    clientUrl
  ],
  credentials: true,
}));
app.use(express.json());

const uri = process.env.MONGODB_URI as string;

if (!uri) {
  console.error("MONGODB_URI is not defined in the environment variables.");
  process.exit(1);
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const db = client.db("GadgetsStore");
const productsCollection = db.collection("products");
const usersCollection = db.collection("user");

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");




    if (db) {
      // ──────────────────────────────────────────────────────────────
      // GET /api/admin/stats  — Admin dashboard analytics
      // ──────────────────────────────────────────────────────────────
      app.get('/api/admin/stats', verifyToken, verifyAdmin, async (req: Request, res: Response) => {
        try {
          const [totalProducts, totalUsers, blockedUsers, adminUsers] = await Promise.all([
            productsCollection.countDocuments(),
            usersCollection.countDocuments(),
            usersCollection.countDocuments({ status: "blocked" }),
            usersCollection.countDocuments({ role: "admin" }),
          ]);

          // Products by category
          const categoryAgg = await productsCollection.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
          ]).toArray();

          // Products added per month (last 6 months)
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

          const monthlyProductsAgg = await productsCollection.aggregate([
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
          ]).toArray();

          // Average price by category
          const avgPriceAgg = await productsCollection.aggregate([
            { $group: { _id: "$category", avgPrice: { $avg: "$price" } } },
            { $sort: { avgPrice: -1 } },
            { $limit: 6 },
          ]).toArray();

          const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const monthlyProducts = monthlyProductsAgg.map((m: any) => ({
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
              categoryBreakdown: categoryAgg.map((c: any) => ({ name: c._id || "Uncategorized", value: c.count })),
              monthlyProducts,
              avgPriceByCategory: avgPriceAgg.map((c: any) => ({
                name: c._id || "Uncategorized",
                avgPrice: Math.round(c.avgPrice || 0),
              })),
            },
          });
        } catch (error) {
          console.error("Error fetching admin stats:", error);
          res.status(500).json({ success: false, message: "Failed to fetch admin stats" });
        }
      });

      // ──────────────────────────────────────────────────────────────
      // GET /api/users/stats  — User dashboard analytics
      // ──────────────────────────────────────────────────────────────
      app.get('/api/users/stats', verifyToken, async (req: Request, res: Response) => {
        try {
          const userIdentifier = req.user?.id || req.user?.email;
          if (!userIdentifier) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
          }

          const userQuery = { $or: [{ createdBy: userIdentifier }, { userId: userIdentifier }] };

          const [totalMyProducts, myProducts] = await Promise.all([
            productsCollection.countDocuments(userQuery),
            productsCollection.find(userQuery).sort({ createdAt: -1 }).toArray(),
          ]);

          // Products by category
          const myCategoryAgg = await productsCollection.aggregate([
            { $match: userQuery },
            { $group: { _id: "$category", count: { $sum: 1 } } },
          ]).toArray();

          // Products added per month (last 6 months)
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

          const myMonthlyAgg = await productsCollection.aggregate([
            { $match: { ...userQuery, createdAt: { $gte: sixMonthsAgo } } },
            {
              $group: {
                _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ]).toArray();

          const totalStockValue = myProducts.reduce((sum: number, p: any) => sum + (Number(p.price) * Number(p.stock || 0)), 0);
          const avgRating = myProducts.length
            ? myProducts.reduce((sum: number, p: any) => sum + Number(p.rating || 0), 0) / myProducts.length
            : 0;

          const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const monthlyProducts = myMonthlyAgg.map((m: any) => ({
            month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
            products: m.count,
          }));

          res.status(200).json({
            success: true,
            data: {
              totalMyProducts,
              totalStockValue: Math.round(totalStockValue),
              avgRating: parseFloat(avgRating.toFixed(1)),
              categoryBreakdown: myCategoryAgg.map((c: any) => ({ name: c._id || "Uncategorized", value: c.count })),
              monthlyProducts,
              recentProducts: myProducts.slice(0, 5).map((p: any) => ({
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
          res.status(500).json({ success: false, message: "Failed to fetch user stats" });
        }
      });


      app.post('/api/products', verifyToken, checkBlocked, async (req: Request, res: Response) => {
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
            createdBy: req.user?.id || req.user?.email, // From verifyToken payload
            userId: req.user?.id || req.user?.email, // Explicitly match user request
            createdAt: new Date()
          };

          const result = await productsCollection.insertOne(newProduct);
          res.status(201).json({ success: true, message: "Product created successfully", data: result });
        } catch (error) {
          console.error("Error creating product:", error);
          res.status(500).json({ success: false, message: "Failed to create product" });
        }
      });

      app.get('/api/products', async (req: Request, res: Response) => {
        try {
          // Parse basic query parameters for pagination and filtering
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 10;
          const skip = (page - 1) * limit;
          const search = req.query.search as string;
          const category = req.query.category as string;
          const brands = req.query.brands as string;
          const minPrice = req.query.minPrice;
          const maxPrice = req.query.maxPrice;
          const sort = req.query.sort as string;

          // Build query object
          const query: any = {};
          
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
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
          }

          // Build sort object
          let sortOption: any = { createdAt: -1 }; // newest by default
          if (sort === 'newest') sortOption = { createdAt: -1 };
          if (sort === 'oldest') sortOption = { createdAt: 1 };
          if (sort === 'price_asc' || sort === 'price-asc') sortOption = { price: 1 };
          if (sort === 'price_desc' || sort === 'price-desc') sortOption = { price: -1 };
          if (sort === 'rating_asc') sortOption = { rating: 1 };
          if (sort === 'rating_desc' || sort === 'rating') sortOption = { rating: -1 };

          // Fetch data
          const total = await productsCollection.countDocuments(query);
          const products = await productsCollection
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
        } catch (error) {
          console.error("Error fetching products:", error);
          res.status(500).json({ success: false, message: "Failed to fetch products" });
        }
      });

      app.get('/api/admin/products', verifyToken, verifyAdmin, async (req: Request, res: Response) => {
        try {
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 10;
          const skip = (page - 1) * limit;
          const search = req.query.search as string;

          const query: any = {};
          
          if (search) {
            query.$or = [
              { title: { $regex: search, $options: 'i' } },
              { brand: { $regex: search, $options: 'i' } },
              { category: { $regex: search, $options: 'i' } }
            ];
          }

          const total = await productsCollection.countDocuments(query);
          const products = await productsCollection
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
        } catch (error) {
          console.error("Error fetching admin products:", error);
          res.status(500).json({ success: false, message: "Failed to fetch admin products" });
        }
      });

      app.get('/api/products/user/my-products', verifyToken, async (req: Request, res: Response) => {
        try {
          const userIdentifier = req.user?.id || req.user?.email;
          
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

          const products = await productsCollection.find(query).sort({ createdAt: -1 }).toArray();

          res.status(200).json({
            success: true,
            data: products
          });
        } catch (error) {
          console.error("Error fetching my products:", error);
          res.status(500).json({ success: false, message: "Failed to fetch user products" });
        }
      });

      app.get('/api/products/:id', async (req: Request, res: Response) => {
        try {
          const id = req.params.id as string;
          
          if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid product ID format" });
          }

          const product = await productsCollection.findOne({ _id: new ObjectId(id) });
          
          if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
          }

          res.status(200).json({ success: true, data: product });
        } catch (error) {
          console.error("Error fetching product by ID:", error);
          res.status(500).json({ success: false, message: "Failed to fetch product" });
        }
      });

      app.patch('/api/products/:id', verifyToken, checkBlocked, async (req: Request, res: Response) => {
        try {
          const id = req.params.id as string;
          
          if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid product ID format" });
          }

          const product = await productsCollection.findOne({ _id: new ObjectId(id) });
          
          if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
          }

          const userIdentifier = req.user?.id || req.user?.email;
          const isAdmin = req.user?.role === 'admin';

          if (product.userId !== userIdentifier && product.createdBy !== userIdentifier && !isAdmin) {
            return res.status(403).json({ success: false, message: "Forbidden: You cannot modify this product" });
          }

          const { title, brand, category, shortDescription, fullDescription, price, rating, stock, thumbnail, images, specifications } = req.body;
          const updateDoc: any = { $set: {} };
          
          if (title !== undefined) updateDoc.$set.title = title;
          if (brand !== undefined) updateDoc.$set.brand = brand;
          if (category !== undefined) updateDoc.$set.category = category;
          if (shortDescription !== undefined) updateDoc.$set.shortDescription = shortDescription;
          if (fullDescription !== undefined) updateDoc.$set.fullDescription = fullDescription;
          if (price !== undefined) updateDoc.$set.price = Number(price);
          if (rating !== undefined) updateDoc.$set.rating = Number(rating);
          if (stock !== undefined) updateDoc.$set.stock = Number(stock);
          if (thumbnail !== undefined) updateDoc.$set.thumbnail = thumbnail;
          if (images !== undefined) updateDoc.$set.images = Array.isArray(images) ? images : [];
          if (specifications !== undefined) updateDoc.$set.specifications = specifications;
          
          updateDoc.$set.updatedAt = new Date();

          const result = await productsCollection.updateOne(
            { _id: new ObjectId(id) },
            updateDoc
          );

          res.status(200).json({ success: true, message: "Product updated successfully", data: result });
        } catch (error) {
          console.error("Error updating product:", error);
          res.status(500).json({ success: false, message: "Failed to update product" });
        }
      });

      app.delete('/api/products/:id', verifyToken, checkBlocked, async (req: Request, res: Response) => {
        try {
          const id = req.params.id as string;
          
          if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid product ID format" });
          }

          const product = await productsCollection.findOne({ _id: new ObjectId(id) });
          
          if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
          }

          const userIdentifier = req.user?.id || req.user?.email;
          const isAdmin = req.user?.role === 'admin';

          if (product.userId !== userIdentifier && product.createdBy !== userIdentifier && !isAdmin) {
            return res.status(403).json({ success: false, message: "Forbidden: You cannot delete this product" });
          }

          const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });

          res.status(200).json({ success: true, message: "Product deleted successfully", data: result });
        } catch (error) {
          console.error("Error deleting product:", error);
          res.status(500).json({ success: false, message: "Failed to delete product" });
        }
      });

      // GET /api/admin/users
      app.get('/api/admin/users', verifyToken, verifyAdmin, async (req: Request, res: Response) => {
        try {
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 10;
          const skip = (page - 1) * limit;
          const search = req.query.search as string;

          const query: any = {};
          if (search) {
            query.$or = [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } }
            ];
          }

          const total = await usersCollection.countDocuments(query);
          const users = await usersCollection
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
              totalPages: Math.ceil(total / limit)
            }
          });
        } catch (error) {
          console.error("Error fetching admin users:", error);
          res.status(500).json({ success: false, message: "Failed to fetch users" });
        }
      });

      // PATCH /api/admin/users/:id/status
      app.patch('/api/admin/users/:id/status', verifyToken, verifyAdmin, async (req: Request, res: Response) => {
        try {
          const id = req.params.id as string;
          const { status } = req.body;

          if (status !== 'active' && status !== 'blocked') {
            return res.status(400).json({ success: false, message: "Invalid status value" });
          }

          let result = await usersCollection.updateOne(
            { _id: id as any },
            { $set: { status, updatedAt: new Date() } }
          );

          if (result.matchedCount === 0 && ObjectId.isValid(id)) {
            result = await usersCollection.updateOne(
              { _id: new ObjectId(id) },
              { $set: { status, updatedAt: new Date() } }
            );
          }

          if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
          }

          res.status(200).json({ success: true, message: "User status updated successfully" });
        } catch (error) {
          console.error("Error updating user status:", error);
          res.status(500).json({ success: false, message: "Failed to update user status" });
        }
      });

      // PATCH /api/admin/users/:id/role
      app.patch('/api/admin/users/:id/role', verifyToken, verifyAdmin, async (req: Request, res: Response) => {
        try {
          const id = req.params.id as string;
          const { role } = req.body;

          if (role !== 'user' && role !== 'admin') {
            return res.status(400).json({ success: false, message: "Invalid role value" });
          }

          const currentUserIdentifier = req.user?.id || req.user?.email;
          const targetUser = await usersCollection.findOne({
            $or: [{ _id: id as any }, { _id: (ObjectId.isValid(id) ? new ObjectId(id) : null) as any }]
          });

          if (targetUser && (targetUser._id === currentUserIdentifier || targetUser.email === req.user?.email) && role === 'user') {
            return res.status(400).json({ success: false, message: "You cannot change your own admin role" });
          }

          let result = await usersCollection.updateOne(
            { _id: id as any },
            { $set: { role, updatedAt: new Date() } }
          );

          if (result.matchedCount === 0 && ObjectId.isValid(id)) {
            result = await usersCollection.updateOne(
              { _id: new ObjectId(id) },
              { $set: { role, updatedAt: new Date() } }
            );
          }

          if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
          }

          res.status(200).json({ success: true, message: "User role updated successfully" });
        } catch (error) {
          console.error("Error updating user role:", error);
          res.status(500).json({ success: false, message: "Failed to update user role" });
        }
      });

      // GET /api/users/profile
      app.get('/api/users/profile', verifyToken, async (req: Request, res: Response) => {
        try {
          const userIdentifier = req.user?.id || req.user?.email;
          if (!userIdentifier) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
          }

          const user = await usersCollection.findOne({
            $or: [
              { _id: userIdentifier as any },
              { id: userIdentifier },
              { email: req.user?.email || userIdentifier }
            ]
          });

          if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
          }

          res.status(200).json({ success: true, data: user });
        } catch (error) {
          console.error("Error fetching user profile:", error);
          res.status(500).json({ success: false, message: "Failed to fetch user profile" });
        }
      });

      // PATCH /api/users/profile
      app.patch('/api/users/profile', verifyToken, checkBlocked, async (req: Request, res: Response) => {
        try {
          const userIdentifier = req.user?.id || req.user?.email;
          if (!userIdentifier) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
          }

          const { name, image, bio, phoneNumber, location } = req.body;

          const updateDoc: any = { $set: {} };
          if (name !== undefined) updateDoc.$set.name = name;
          if (image !== undefined) updateDoc.$set.image = image;
          if (bio !== undefined) updateDoc.$set.bio = bio;
          if (phoneNumber !== undefined) updateDoc.$set.phoneNumber = phoneNumber;
          if (location !== undefined) updateDoc.$set.location = location;
          updateDoc.$set.updatedAt = new Date();

          let result = await usersCollection.updateOne(
            { _id: userIdentifier as any },
            updateDoc
          );

          if (result.matchedCount === 0) {
            result = await usersCollection.updateOne(
              { email: (req.user?.email || userIdentifier) as any },
              updateDoc
            );
          }

          if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "User profile not found" });
          }

          const updatedUser = await usersCollection.findOne({
            $or: [
              { _id: userIdentifier as any },
              { email: (req.user?.email || userIdentifier) as any }
            ]
          });

          res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedUser });
        } catch (error) {
          console.error("Error updating user profile:", error);
          res.status(500).json({ success: false, message: "Failed to update user profile" });
        }
      });
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
}
run().catch(console.dir);

app.get('/', (req: Request, res: Response) => {
  res.send('Gadget Store API is running and connected to MongoDB');
});
