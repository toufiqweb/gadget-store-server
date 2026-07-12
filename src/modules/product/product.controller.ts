import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import * as ProductService from './product.service';

export const createProduct = async (req: Request, res: Response): Promise<any> => {
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
      createdBy: req.user?.id || req.user?.email,
      userId: req.user?.id || req.user?.email,
      createdAt: new Date()
    };

    const result = await ProductService.createProduct(newProduct);
    res.status(201).json({ success: true, message: "Product created successfully", data: result });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ success: false, message: "Failed to create product" });
  }
};

export const getProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const brands = req.query.brands as string;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const sort = req.query.sort as string;

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

    let sortOption: any = { createdAt: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'price_asc' || sort === 'price-asc') sortOption = { price: 1 };
    if (sort === 'price_desc' || sort === 'price-desc') sortOption = { price: -1 };
    if (sort === 'rating_asc') sortOption = { rating: 1 };
    if (sort === 'rating_desc' || sort === 'rating') sortOption = { rating: -1 };

    const { total, products } = await ProductService.getProducts(query, sortOption, skip, limit);

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
};

export const getMyProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const userIdentifier = req.user?.id || req.user?.email;
    
    if (!userIdentifier) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing user identifier" });
    }

    const query = {
      $or: [
        { createdBy: userIdentifier },
        { userId: userIdentifier }
      ]
    };

    const products = await ProductService.getMyProducts(query);

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error("Error fetching my products:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user products" });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID format" });
    }

    const product = await ProductService.getProductById(id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ success: false, message: "Failed to fetch product" });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID format" });
    }

    const product = await ProductService.getProductById(id);
    
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

    const result = await ProductService.updateProduct(id, updateDoc);

    res.status(200).json({ success: true, message: "Product updated successfully", data: result });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ success: false, message: "Failed to update product" });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID format" });
    }

    const product = await ProductService.getProductById(id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const userIdentifier = req.user?.id || req.user?.email;
    const isAdmin = req.user?.role === 'admin';

    if (product.userId !== userIdentifier && product.createdBy !== userIdentifier && !isAdmin) {
      return res.status(403).json({ success: false, message: "Forbidden: You cannot delete this product" });
    }

    const result = await ProductService.deleteProduct(id);

    res.status(200).json({ success: true, message: "Product deleted successfully", data: result });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Failed to delete product" });
  }
};
