import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../api";
import { useAuth } from "../contexts/AuthContext";

import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import ConfirmationModal from "../components/ui/ConfirmationModal";

// Define the type for a raw material
interface RawMaterial {
  id: string;
  name: string;
  cost: number;
}

const RawMaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(
    null
  );
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Fetch materials from the API
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<RawMaterial[]>("/raw-materials");
      setMaterials(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        await logout();
        navigate("/login");
      } else {
        toast.error("Failed to fetch raw materials.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleOpenEditModal = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMaterial) return;
    try {
      await apiClient.delete(`/raw-materials/${selectedMaterial.id}`);
      toast.success(`"${selectedMaterial.name}" deleted successfully.`);
      // Refetch materials to ensure consistency with the backend
      await fetchMaterials();
      setIsDeleteModalOpen(false);
      setSelectedMaterial(null);
    } catch (error) {
      toast.error("Failed to delete raw material.");
    }
  };

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }),
    []
  );

  return (
    <>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
              <Link
                to="/"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
                &larr; Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold leading-tight text-gray-900 mt-1">
                Raw Materials
              </h1>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)} className="w-auto">
              Add Material
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-12 text-center text-gray-500">
                  Loading materials...
                </div>
              ) : materials.length === 0 ? (
                <div className="text-center p-12">
                  <h3 className="text-lg font-medium text-gray-900">
                    No Raw Materials Found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding your first raw material.
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setIsAddModalOpen(true)}
                      className="w-auto inline-flex items-center">
                      Add Material
                    </Button>
                  </div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost per Quintal
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {materials.map((material) => (
                      <tr key={material.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {material.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {currencyFormatter.format(material.cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                          <button
                            onClick={() => handleOpenEditModal(material)}
                            className="text-indigo-600 hover:text-indigo-900">
                            Edit
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(material)}
                            className="text-red-600 hover:text-red-900">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      <AddRawMaterialModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onMaterialAdded={(newMaterial) => {
          setMaterials((prev) =>
            [...prev, newMaterial].sort((a, b) => a.name.localeCompare(b.name))
          );
          setIsAddModalOpen(false);
        }}
      />

      {selectedMaterial && (
        <EditRawMaterialModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedMaterial(null);
          }}
          material={selectedMaterial}
          onMaterialUpdated={() => {
            fetchMaterials(); // Refetch all materials to get updated costs and product prices
            setIsEditModalOpen(false);
            setSelectedMaterial(null);
          }}
        />
      )}

      {selectedMaterial && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedMaterial(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Raw Material"
          message={`Are you sure you want to delete "${selectedMaterial.name}"? This will remove it from all products and cannot be undone.`}
        />
      )}
    </>
  );
};

// --- Modal Components ---

const AddRawMaterialModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onMaterialAdded: (material: RawMaterial) => void;
}> = ({ isOpen, onClose, onMaterialAdded }) => {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await apiClient.post("/raw-materials", {
        name,
        cost: parseFloat(cost),
      });
      toast.success("Raw material added successfully!");
      onMaterialAdded(response.data);
      setName("");
      setCost("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add material.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Raw Material">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Material Name"
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Cost per Quintal (INR)"
          id="cost"
          type="number"
          step="0.01"
          min="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          required
          placeholder="e.g., 2350.50"
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
            Cancel
          </button>
          <Button type="submit" isLoading={isSubmitting} className="w-auto">
            Add Material
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const EditRawMaterialModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  material: RawMaterial;
  onMaterialUpdated: () => void;
}> = ({ isOpen, onClose, material, onMaterialUpdated }) => {
  const [cost, setCost] = useState(material.cost.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCost(material.cost.toString());
  }, [material]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.put(`/raw-materials/${material.id}`, {
        cost: parseFloat(cost),
      });
      toast.success(`Cost for "${material.name}" updated successfully!`);
      onMaterialUpdated();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update material."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Cost for ${material.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Material Name"
          id="edit-name"
          type="text"
          value={material.name}
          disabled
          className="bg-gray-100"
        />
        <Input
          label="New Cost per Quintal (INR)"
          id="edit-cost"
          type="number"
          step="0.01"
          min="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          required
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
            Cancel
          </button>
          <Button type="submit" isLoading={isSubmitting} className="w-auto">
            Update Cost
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RawMaterialsPage;
