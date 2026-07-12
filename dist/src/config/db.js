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
exports.db = exports.connectDB = void 0;
const mongodb_1 = require("mongodb");
const env_1 = require("./env");
if (!env_1.env.MONGODB_URI) {
    console.error("MONGODB_URI is not defined in the environment variables.");
    process.exit(1);
}
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new mongodb_1.MongoClient(env_1.env.MONGODB_URI, {
    serverApi: {
        version: mongodb_1.ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield client.connect();
        yield client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    catch (error) {
        console.error("Failed to connect to MongoDB", error);
    }
});
exports.connectDB = connectDB;
exports.db = client.db("GadgetsStore");
