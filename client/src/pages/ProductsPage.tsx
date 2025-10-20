import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../api";

import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import Combobox from "../components/ui/Combobox";

// --- Types ---
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
interface IngredientInput {
  rawMaterial: RawMaterial | null;
  percentage: string;
}

// --- Main Component ---
const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  const handleOpenDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;
    try {
      await apiClient.delete(`/products/${selectedProduct.id}`);
      toast.success("Product deleted successfully.");
      setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      toast.error("Failed to delete product.");
    }
  };

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }),
    []
  );

  return (
    <>
      <div className="min-h-screen bg-gray-100">
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
              Add New Product
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="text-center bg-white shadow sm:rounded-lg p-12">
              <h3 className="text-lg font-medium text-gray-900">
                No Products Found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first product.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-auto inline-flex items-center">
                  Add Product
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white shadow-lg rounded-lg p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-gray-900">
                        {product.name}
                      </h3>
                      <button
                        onClick={() => handleOpenDeleteModal(product)}
                        className="text-gray-400 hover:text-red-600">
                        &times;
                      </button>
                    </div>
                    <p className="text-3xl font-bold text-indigo-600 mt-2">
                      {currencyFormatter.format(product.totalCost)}
                      <span className="text-sm font-normal text-gray-500">
                        {" "}
                        / quintal
                      </span>
                    </p>
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Composition
                      </h4>
                      <ul className="mt-2 space-y-1 text-sm text-gray-700">
                        {product.ingredients.map((ing) => (
                          <li key={ing.id} className="flex justify-between">
                            <span>{ing.rawMaterial.name}</span>
                            <span>{ing.percentage}%</span>
                          </li>
                        ))}
                        {product.additionalCost > 0 && (
                          <li className="flex justify-between font-medium">
                            <span>Additional Costs</span>
                            <span>
                              {currencyFormatter.format(product.additionalCost)}
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductAdded={() => {
          setIsAddModalOpen(false);
          fetchProducts();
        }}
      />

      {selectedProduct && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedProduct(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Product"
          message={`Are you sure you want to delete "${selectedProduct.name}"? This action cannot be undone.`}
        />
      )}
    </>
  );
};

// --- Add Product Modal Component ---

const AddProductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}> = ({ isOpen, onClose, onProductAdded }) => {
  const [name, setName] = useState("");
  const [additionalCost, setAdditionalCost] = useState("0");
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { rawMaterial: null, percentage: "" },
  ]);
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>(
    []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialCost, setNewMaterialCost] = useState("");
  const [isCreateMaterialModalOpen, setCreateMaterialModalOpen] =
    useState(false);
  const [materialCreationCallback, setMaterialCreationCallback] = useState<
    ((newMaterial: RawMaterial) => void) | null
  >(null);

  const fetchMaterials = useCallback(async () => {
    try {
      const response = await apiClient.get<RawMaterial[]>("/raw-materials");
      setAvailableMaterials(response.data);
    } catch (error) {
      toast.error("Could not load raw materials.");
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchMaterials();
  }, [isOpen, fetchMaterials]);

  const handleIngredientChange = (
    index: number,
    field: "rawMaterial" | "percentage",
    value: any
  ) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const addIngredientRow = () =>
    setIngredients([...ingredients, { rawMaterial: null, percentage: "" }]);
  const removeIngredientRow = (index: number) =>
    setIngredients(ingredients.filter((_, i) => i !== index));

  const handleCreateNewMaterial = (
    name: string,
    callback: (newMaterial: RawMaterial) => void
  ) => {
    setNewMaterialName(name);
    setMaterialCreationCallback(() => callback);
    setCreateMaterialModalOpen(true);
  };

  const handleConfirmCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post<RawMaterial>("/raw-materials", {
        name: newMaterialName,
        cost: parseFloat(newMaterialCost),
      });
      toast.success(`'${newMaterialName}' created successfully.`);
      const newMaterial = response.data;

      await fetchMaterials(); // Refetch all materials
      materialCreationCallback?.(newMaterial); // Use callback to set it in the combobox

      setCreateMaterialModalOpen(false);
      setNewMaterialName("");
      setNewMaterialCost("");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to create material."
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalPercentage = ingredients.reduce(
      (sum, i) => sum + (parseFloat(i.percentage) || 0),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error(
        `Percentages must add up to 100%. Current total: ${totalPercentage.toFixed(
          2
        )}%`
      );
      return;
    }
    if (ingredients.some((i) => !i.rawMaterial)) {
      toast.error("Please select a raw material for each ingredient.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        additionalCost: parseFloat(additionalCost) || 0,
        ingredients: ingredients.map((i) => ({
          rawMaterialId: i.rawMaterial!.id,
          percentage: parseFloat(i.percentage),
        })),
      };
      await apiClient.post("/products", payload);
      toast.success("Product created successfully!");
      onProductAdded();
      // Reset form state
      setName("");
      setAdditionalCost("0");
      setIngredients([{ rawMaterial: null, percentage: "" }]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
                  <div className="flex-grow">
                    <Combobox
                      items={availableMaterials}
                      selectedValue={ing.rawMaterial}
                      onChange={(value) =>
                        handleIngredientChange(index, "rawMaterial", value)
                      }
                      onCreateNew={(name) =>
                        handleCreateNewMaterial(name, (newMat) =>
                          handleIngredientChange(index, "rawMaterial", newMat)
                        )
                      }
                    />
                  </div>
                  <Input
                    label=""
                    id={`percentage-${index}`}
                    type="number"
                    step="0.01"
                    value={ing.percentage}
                    onChange={(e) =>
                      handleIngredientChange(
                        index,
                        "percentage",
                        e.target.value
                      )
                    }
                    required
                    placeholder="%"
                    className="w-24"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(index)}
                    className="text-gray-400 hover:text-red-600 p-2"
                    disabled={ingredients.length <= 1}>
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addIngredientRow}
              className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500">
              + Add Ingredient
            </button>
          </div>
          <Input
            label="Additional Costs per Quintal (INR)"
            id="additional-cost"
            type="number"
            step="0.01"
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

      <Modal
        isOpen={isCreateMaterialModalOpen}
        onClose={() => setCreateMaterialModalOpen(false)}
        title={`Create New Material: ${newMaterialName}`}>
        <form onSubmit={handleConfirmCreateMaterial} className="space-y-4">
          <Input
            label="Material Name"
            id="new-mat-name"
            type="text"
            value={newMaterialName}
            disabled
            className="bg-gray-100"
          />
          <Input
            label="Cost per Quintal (INR)"
            id="new-mat-cost"
            type="number"
            step="0.01"
            value={newMaterialCost}
            onChange={(e) => setNewMaterialCost(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateMaterialModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
              Cancel
            </button>
            <Button type="submit" className="w-auto">
              Create and Use
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default ProductsPage;
