import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../api";

import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";

// Define types
interface RawMaterial {
  id: string;
  name: string;
  cost: number;
}
interface ProductIngredient {
  id: string;
  percentage: number;
  rawMaterial: RawMaterial;
}
interface Product {
  id: string;
  name: string;
  additionalCost: number;
  totalCost: number;
  ingredients: ProductIngredient[];
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<Product[]>("/products");
      setProducts(response.data);
    } catch (error) {
      toast.error("Failed to fetch products.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this product? This action cannot be undone."
      )
    ) {
      try {
        await apiClient.delete(`/products/${id}`);
        toast.success("Product deleted successfully.");
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } catch (error) {
        toast.error("Failed to delete product.");
      }
    }
  };

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }),
    []
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <Link
              to="/"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              &larr; Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold leading-tight text-gray-900 mt-1">
              Products
            </h1>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="w-auto">
            Add Product
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <p className="p-6 text-center text-gray-500">Loading products...</p>
          ) : products.length === 0 ? (
            <div className="text-center p-12">
              <h3 className="text-sm font-medium text-gray-900">
                No products found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new product.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-auto inline-flex">
                  Add your first product
                </Button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {products.map((product) => (
                <li key={product.id} className="p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-indigo-600">
                        {product.name}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {currencyFormatter.format(product.totalCost)}{" "}
                        <span className="text-sm font-normal text-gray-500">
                          / quintal
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-sm text-red-600 hover:text-red-800">
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Composition
                    </p>
                    <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                      {product.ingredients.map((ing) => (
                        <li key={ing.id}>
                          {ing.rawMaterial.name}: {ing.percentage}%
                        </li>
                      ))}
                      {product.additionalCost > 0 && (
                        <li>
                          Additional Costs:{" "}
                          {currencyFormatter.format(product.additionalCost)}
                        </li>
                      )}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductAdded={() => {
          setIsAddModalOpen(false);
          fetchProducts(); // Refetch all products to get the latest list and costs
        }}
      />
    </div>
  );
};

const AddProductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}> = ({ isOpen, onClose, onProductAdded }) => {
  const [name, setName] = useState("");
  const [additionalCost, setAdditionalCost] = useState("0");
  const [ingredients, setIngredients] = useState([
    { rawMaterialId: "", percentage: "" },
  ]);
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>(
    []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available raw materials when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchMats = async () => {
        try {
          const response = await apiClient.get<RawMaterial[]>("/raw-materials");
          setAvailableMaterials(response.data);
        } catch (error) {
          toast.error("Could not load raw materials.");
        }
      };
      fetchMats();
    }
  }, [isOpen]);

  const handleIngredientChange = (
    index: number,
    field: "rawMaterialId" | "percentage",
    value: string
  ) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const addIngredientRow = () => {
    setIngredients([...ingredients, { rawMaterialId: "", percentage: "" }]);
  };

  const removeIngredientRow = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalPercentage = ingredients.reduce(
      (sum, i) => sum + (parseFloat(i.percentage) || 0),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error(
        `Percentages must add up to 100. Current total: ${totalPercentage.toFixed(
          2
        )}%`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        additionalCost: parseFloat(additionalCost) || 0,
        ingredients: ingredients.map((i) => ({
          rawMaterialId: i.rawMaterialId,
          percentage: parseFloat(i.percentage),
        })),
      };
      await apiClient.post("/products", payload);
      toast.success("Product created successfully!");
      onProductAdded();
      // Reset form
      setName("");
      setAdditionalCost("0");
      setIngredients([{ rawMaterialId: "", percentage: "" }]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Product">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Product Name"
          id="product-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Ingredients
          </label>
          <div className="space-y-3 mt-1">
            {ingredients.map((ing, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={ing.rawMaterialId}
                  onChange={(e) =>
                    handleIngredientChange(
                      index,
                      "rawMaterialId",
                      e.target.value
                    )
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required>
                  <option value="" disabled>
                    Select Material
                  </option>
                  {availableMaterials.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name}
                    </option>
                  ))}
                </select>
                <Input
                  label=""
                  id={`percentage-${index}`}
                  type="number"
                  value={ing.percentage}
                  onChange={(e) =>
                    handleIngredientChange(index, "percentage", e.target.value)
                  }
                  required
                  placeholder="%"
                  className="w-24"
                />
                <button
                  type="button"
                  onClick={() => removeIngredientRow(index)}
                  className="text-gray-400 hover:text-red-600"
                  disabled={ingredients.length <= 1}>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addIngredientRow}
            className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500">
            + Add another ingredient
          </button>
        </div>

        <Input
          label="Additional Costs per Quintal (INR)"
          id="additional-cost"
          type="number"
          value={additionalCost}
          onChange={(e) => setAdditionalCost(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
            Cancel
          </button>
          <Button type="submit" isLoading={isSubmitting} className="w-auto">
            Create Product
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductsPage;
