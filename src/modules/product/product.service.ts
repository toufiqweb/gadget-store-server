import { ObjectId } from 'mongodb';
import { productsCollection } from '../../db/collections';

export const createProduct = async (productData: any) => {
  return await productsCollection.insertOne(productData);
};

export const getProducts = async (query: any, sortOption: any, skip: number, limit: number) => {
  const total = await productsCollection.countDocuments(query);
  const products = await productsCollection
    .find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .toArray();
  
  return { total, products };
};

export const getMyProducts = async (userQuery: any) => {
  return await productsCollection.find(userQuery).sort({ createdAt: -1 }).toArray();
};

export const getProductById = async (id: string) => {
  return await productsCollection.findOne({ _id: new ObjectId(id) });
};

export const updateProduct = async (id: string, updateDoc: any) => {
  return await productsCollection.updateOne(
    { _id: new ObjectId(id) },
    updateDoc
  );
};

export const deleteProduct = async (id: string) => {
  return await productsCollection.deleteOne({ _id: new ObjectId(id) });
};
