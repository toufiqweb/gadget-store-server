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

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
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

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");




    const db = client ? client.db("GadgetsStore") : null;

    if (db) {
      const productsCollection = db.collection("products");

      app.post('/api/products', verifyToken, async (req: Request, res: Response) => {
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
          const id = req.params.id;
          
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

// Handle graceful shutdown to close the database connection properly
process.on('SIGINT', async () => {
  console.log("Closing MongoDB connection...");
  await client.close();
  process.exit(0);
});
