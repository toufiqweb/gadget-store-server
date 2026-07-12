import { MongoClient, ServerApiVersion } from 'mongodb';
import { env } from './env';

if (!env.MONGODB_URI) {
  console.error("MONGODB_URI is not defined in the environment variables.");
  process.exit(1);
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export const connectDB = async () => {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
};

export const db = client.db("GadgetsStore");
