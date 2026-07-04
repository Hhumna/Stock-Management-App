import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Activity, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function Categories() {
  const { user } = useAuth();
  
  // State
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Form Values
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const url = search ? `/categories/?search=${encodeURIComponent(search)}` : '/categories/';
      const res = await api.get(url);
      if (res.data?.success) {
        setCategories(res.data.data.categories || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search]);

  const handleOpenAdd = () => {
    setFormName('');
    setFormDesc('');
    setCurrentCategory(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (category) => {
    setCurrentCategory(category);
    setFormName(category.name);
    setFormDesc(category.description || '');
    setIsEditOpen(true);
  };

  const handleOpenDelete = (category) => {
    setCurrentCategory(category);
    setIsDeleteOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const toastId = toast.loading(`Creating category: ${formName}...`);

    try {
      const response = await api.post('/categories/', {
        name: formName,
        description: formDesc
      });
      if (response.data?.success) {
        toast.success('Category created successfully!', { id: toastId });
        setIsAddOpen(false);
        fetchCategories();
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Failed to create category.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentCategory) return;
    
    setSubmitting(true);
    const toastId = toast.loading(`Updating category...`);

    try {
      const response = await api.put(`/categories/${currentCategory.id}`, {
        name: formName,
        description: formDesc
      });
      if (response.data?.success) {
        toast.success('Category updated successfully!', { id: toastId });
        setIsEditOpen(false);
        fetchCategories();
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Failed to update category.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!currentCategory) return;
    
    setSubmitting(true);
    const toastId = toast.loading(`Deleting category...`);

    try {
      const response = await api.delete(`/categories/${currentCategory.id}`);
      if (response.data?.success) {
        toast.success(response.data.message || 'Category deleted.', { id: toastId });
        setIsDeleteOpen(false);
        fetchCategories();
      }
    } catch (error) {
      console.error(error);
      // Cleanly toast the backend's 409 conflict error when category has products
      const errMsg = error.response?.data?.error || error.message || 'Failed to delete category.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'id', header: 'ID', sortable: false },
    { key: 'name', header: 'Category Name', sortable: false, render: (row) => (
      <span className="font-semibold text-brand-textMain">{row.name}</span>
    )},
    { key: 'description', header: 'Description', sortable: false, render: (row) => (
      <span className="text-brand-textMuted max-w-md truncate block">
        {row.description || <span className="text-brand-textLight italic">No description</span>}
      </span>
    )},
    { key: 'actions', header: 'Actions', sortable: false, render: (row) => (
      <div className="flex gap-2">
        {user?.role === 'admin' && (
          <button 
            onClick={() => handleOpenEdit(row)}
            className="text-brand-textMuted hover:text-blue-600 p-1"
            title="Edit Category"
          >
            <Edit2 size={16} />
          </button>
        )}
        {user?.role === 'admin' && (
          <button 
            onClick={() => handleOpenDelete(row)}
            className="text-brand-textMuted hover:text-red-600 p-1"
            title="Delete Category"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    )}
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-textMain">Product Categories</h1>
          <p className="text-sm text-brand-textMuted mt-1">Classify your catalog products into logical categories.</p>
        </div>
        {user?.role === 'admin' && (
          <Button variant="primary" onClick={handleOpenAdd} className="gap-2">
            <Plus size={16} />
            <span>Add Category</span>
          </Button>
        )}
      </div>

      {/* Search Filter Card */}
      <Card className="py-4">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textLight">
            <Search size={18} />
          </div>
          <input 
            type="text"
            placeholder="Search categories by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain placeholder-brand-textLight focus:outline-none focus:ring-1 focus:ring-brand-accent"
          />
        </div>
      </Card>

      {/* Main categories table view */}
      {loading && categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[25vh] gap-3">
          <Activity className="animate-spin text-brand-accent" size={24} />
          <span className="text-sm text-brand-textMuted">Loading classifications...</span>
        </div>
      ) : (
        <Table 
          columns={columns}
          data={categories}
          totalPages={1}
        />
      )}

      {/* ── Add Category Modal ── */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Category"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleAddSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Category'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Category Name</label>
            <input 
              type="text" required placeholder="Electronics" value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Description</label>
            <textarea
              placeholder="Gadgets, monitors, keyboards, and components."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain h-24 resize-none"
            />
          </div>
        </form>
      </Modal>

      {/* ── Edit Category Modal ── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Category Details"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Category Name</label>
            <input 
              type="text" required value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Description</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain h-24 resize-none"
            />
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Delete"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteSubmit} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 text-brand-textMain text-sm">
          <AlertTriangle className="text-red-500 shrink-0" size={24} />
          <div>
            <p className="font-semibold text-base text-slate-800">Delete Category?</p>
            <p className="mt-1.5 text-brand-textMuted">
              This will permanently delete the category <strong className="text-brand-textMain">{currentCategory?.name}</strong>.
            </p>
            <p className="text-xs text-red-600 font-medium mt-2 bg-red-50 border border-red-100 rounded p-2">
              Note: This action will fail with a Conflict error if any products belong to this category.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
