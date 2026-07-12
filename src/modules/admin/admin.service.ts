import { ObjectId } from 'mongodb';
import { productsCollection, usersCollection } from '../../db/collections';

export const getAdminStats = async (sixMonthsAgo: Date) => {
  const [totalProducts, totalUsers, blockedUsers, adminUsers] = await Promise.all([
    productsCollection.countDocuments(),
    usersCollection.countDocuments(),
    usersCollection.countDocuments({ status: "blocked" }),
    usersCollection.countDocuments({ role: "admin" }),
  ]);

  const categoryAgg = await productsCollection.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]).toArray();

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

  const avgPriceAgg = await productsCollection.aggregate([
    { $group: { _id: "$category", avgPrice: { $avg: "$price" } } },
    { $sort: { avgPrice: -1 } },
    { $limit: 6 },
  ]).toArray();

  return { totalProducts, totalUsers, blockedUsers, adminUsers, categoryAgg, monthlyProductsAgg, avgPriceAgg };
};

export const getAdminProducts = async (query: any, skip: number, limit: number) => {
  const total = await productsCollection.countDocuments(query);
  const products = await productsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  return { total, products };
};

export const getAdminUsers = async (query: any, skip: number, limit: number) => {
  const total = await usersCollection.countDocuments(query);
  const users = await usersCollection
    .find(query)
    .skip(skip)
    .limit(limit)
    .toArray();
    
  return { total, users };
};

export const updateUserStatus = async (id: string, status: string) => {
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
  
  return result;
};

export const findUserByIdOrString = async (id: string) => {
  return await usersCollection.findOne({
    $or: [{ _id: id as any }, { _id: (ObjectId.isValid(id) ? new ObjectId(id) : null) as any }]
  });
};

export const updateUserRole = async (id: string, role: string) => {
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
  
  return result;
};
