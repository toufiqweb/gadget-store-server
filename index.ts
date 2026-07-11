import express, { Request, Response } from 'express';
import cors from 'cors';
import { MongoClient, ServerApiVersion } from 'mongodb';
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
            createdAt: new Date()
          };

          const result = await productsCollection.insertOne(newProduct);
          res.status(201).json({ success: true, message: "Product created successfully", data: result });
        } catch (error) {
          console.error("Error creating product:", error);
          res.status(500).json({ success: false, message: "Failed to create product" });
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
