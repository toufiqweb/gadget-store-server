import { productsCollection, usersCollection } from '../../db/collections';

export const getUserStats = async (userQuery: any, sixMonthsAgo: Date) => {
  const [totalMyProducts, myProducts] = await Promise.all([
    productsCollection.countDocuments(userQuery),
    productsCollection.find(userQuery).sort({ createdAt: -1 }).toArray(),
  ]);

  const myCategoryAgg = await productsCollection.aggregate([
    { $match: userQuery },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]).toArray();

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

  return { totalMyProducts, myProducts, myCategoryAgg, myMonthlyAgg };
};

export const getUserProfile = async (userIdentifier: string, userEmail: string) => {
  return await usersCollection.findOne({
    $or: [
      { _id: userIdentifier as any },
      { id: userIdentifier },
      { email: userEmail || userIdentifier }
    ]
  });
};

export const updateUserProfile = async (userIdentifier: string, userEmail: string, updateDoc: any) => {
  let result = await usersCollection.updateOne(
    { _id: userIdentifier as any },
    updateDoc
  );

  if (result.matchedCount === 0) {
    result = await usersCollection.updateOne(
      { email: (userEmail || userIdentifier) as any },
      updateDoc
    );
  }

  return result;
};
