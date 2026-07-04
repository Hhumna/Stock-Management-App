import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Download, 
  Edit2, 
  Trash2, 
  Eye, 
  Activity, 
  Filter,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal forms state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Form values
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formReorder, setFormReorder] = useState(10);
  const [formPrice, setFormPrice] = useState('0.00');
  const [submitting, setSubmitting] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load supporting lists
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [catsRes, supsRes] = await Promise.all([
          api.get('/categories/'),
          api.get('/suppliers/')
        ]);
        setCategories(catsRes.data?.data?.categories || []);
        setSuppliers(supsRes.data?.data?.suppliers || []);
      } catch (error) {
        console.error('Failed to load filter metadata:', error);
      }
    };
    loadFilters();
  }, []);

  // Primary fetch effect
  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `/products/?page=${page}&per_page=${perPage}&sort_by=${sortBy}&order=${sortOrder}`;
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (selectedCategory) {
        url += `&category_id=${selectedCategory}`;
      }

      const res = await api.get(url);
      if (res.data?.success) {
        setProducts(res.data.data.products || []);
        setTotalPages(res.data.data.pages || 1);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to retrieve products catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, debouncedSearch, selectedCategory, sortBy, sortOrder]);

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
  };

  // CSV Export Action
  const handleExportCSV = async () => {
    const toastId = toast.loading('Generating export CSV report...');
    try {
      let url = '/products/export/csv?';
      if (debouncedSearch) url += `search=${encodeURIComponent(debouncedSearch)}&`;
      if (selectedCategory) url += `category_id=${selectedCategory}&`;

      const response = await api.get(url, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `products_export_${today}.csv`);
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('CSV Download complete!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to export CSV report.', { id: toastId });
    }
  };

  // Form helpers
  const resetForm = () => {
    setFormName('');
    setFormSku('');
    setFormCategory('');
    setFormSupplier('');
    setFormReorder(10);
    setFormPrice('0.00');
    setCurrentProduct(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (product) => {
    setCurrentProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormCategory(product.category_id || '');
    setFormSupplier(product.supplier_id || '');
    setFormReorder(product.reorder_level);
    setFormPrice(product.unit_price);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (product) => {
    setCurrentProduct(product);
    setIsDeleteOpen(true);
  };

  // CRUD submissions
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const toastId = toast.loading(`Adding ${formName} to catalog...`);

    try {
      const response = await api.post('/products/', {
        name: formName,
        sku: formSku,
        category_id: formCategory ? parseInt(formCategory) : null,
        supplier_id: formSupplier ? parseInt(formSupplier) : null,
        reorder_level: parseInt(formReorder),
        unit_price: formPrice
      });

      if (response.data?.success) {
        toast.success('Product added successfully!', { id: toastId });
        setIsAddOpen(false);
        fetchProducts();
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Failed to create product.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentProduct) return;
    
    setSubmitting(true);
    const toastId = toast.loading(`Updating ${formName}...`);

    try {
      const response = await api.put(`/products/${currentProduct.id}`, {
        name: formName,
        sku: formSku,
        category_id: formCategory ? parseInt(formCategory) : null,
        supplier_id: formSupplier ? parseInt(formSupplier) : null,
        reorder_level: parseInt(formReorder),
        unit_price: formPrice
      });

      if (response.data?.success) {
        toast.success('Product updated successfully!', { id: toastId });
        setIsEditOpen(false);
        fetchProducts();
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Failed to update product.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!currentProduct) return;
    
    setSubmitting(true);
    const toastId = toast.loading(`Deleting ${currentProduct.name}...`);

    try {
      const response = await api.delete(`/products/${currentProduct.id}`);
      if (response.data?.success) {
        toast.success('Product and history deleted!', { id: toastId });
        setIsDeleteOpen(false);
        fetchProducts();
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Failed to delete product.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Table Columns Definition
  const columns = [
    { key: 'sku', header: 'SKU', sortable: true, render: (row) => (
      <span className="font-mono text-xs font-semibold text-brand-textMain">{row.sku}</span>
    )},
    { key: 'name', header: 'Name', sortable: true, render: (row) => (
      <div 
        className="font-medium text-brand-accent hover:underline cursor-pointer"
        onClick={() => navigate(`/products/${row.id}`)}
      >
        {row.name}
      </div>
    )},
    { key: 'category', header: 'Category', sortable: false, render: (row) => {
      const cat = categories.find(c => c.id === row.category_id);
      return cat ? cat.name : <span className="text-brand-textLight">—</span>;
    }},
    { key: 'quantity', header: 'Quantity', sortable: true, render: (row) => (
      <span className={row.is_low_stock ? 'font-bold text-red-600' : 'font-semibold text-slate-700'}>
        {row.quantity}
      </span>
    )},
    { key: 'reorder_level', header: 'Reorder Lvl', sortable: false },
    { key: 'unit_price', header: 'Price', sortable: true, render: (row) => (
      <span>${parseFloat(row.unit_price).toFixed(2)}</span>
    )},
    { key: 'status', header: 'Status', sortable: false, render: (row) => (
      <Badge variant={row.is_low_stock ? 'red' : 'green'}>
        {row.is_low_stock ? 'Low Stock' : 'In Stock'}
      </Badge>
    )},
    { key: 'actions', header: 'Actions', sortable: false, render: (row) => (
      <div className="flex gap-2">
        <button 
          onClick={() => navigate(`/products/${row.id}`)}
          className="text-brand-textMuted hover:text-brand-accent p-1"
          title="View Details"
        >
          <Eye size={16} />
        </button>
        <button 
          onClick={() => handleOpenEdit(row)}
          className="text-brand-textMuted hover:text-blue-600 p-1"
          title="Edit Product"
        >
          <Edit2 size={16} />
        </button>
        {user?.role === 'admin' && (
          <button 
            onClick={() => handleOpenDelete(row)}
            className="text-brand-textMuted hover:text-red-600 p-1"
            title="Delete Product"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    )}
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-textMain">Products Catalog</h1>
          <p className="text-sm text-brand-textMuted mt-1">Add, browse, and edit your warehouse inventory products.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportCSV} className="gap-2">
            <Download size={16} />
            <span>Export CSV</span>
          </Button>
          <Button variant="primary" onClick={handleOpenAdd} className="gap-2">
            <Plus size={16} />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Filter and search row */}
      <Card className="py-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textLight">
              <Search size={18} />
            </div>
            <input 
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain placeholder-brand-textLight focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-sm text-brand-textMuted whitespace-nowrap">
              <Filter size={16} />
              <span>Category:</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full md:w-48 px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main Table view */}
      {loading && products.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3">
          <Activity className="animate-spin text-brand-accent" size={24} />
          <span className="text-sm text-brand-textMuted">Loading catalog items...</span>
        </div>
      ) : (
        <Table
          columns={columns}
          data={products}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* ── Add Product Modal ── */}
      <Modal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)}
        title="Add Product to Catalog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleAddSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Product'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Product Name</label>
              <input 
                type="text" required placeholder="MX Master Mouse" value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain focus:ring-1 focus:ring-brand-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">SKU Code</label>
              <input 
                type="text" required placeholder="SKU-MS-LOGI" value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain focus:ring-1 focus:ring-brand-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Category</label>
              <select 
                value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Supplier</label>
              <select 
                value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Reorder Level Threshold</label>
              <input 
                type="number" required min={0} value={formReorder}
                onChange={(e) => setFormReorder(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Unit Price ($)</label>
              <input 
                type="number" step="0.01" required min={0} value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-brand-border rounded p-3 text-[11px] text-brand-textMuted leading-relaxed">
            <strong>Initial Stock:</strong> Newly created products start with a quantity of 0. Adding stock can only be performed via the stock transactions module (records inflow transactions).
          </div>
        </form>
      </Modal>

      {/* ── Edit Product Modal ── */}
      <Modal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)}
        title="Edit Product Metadata"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Product Name</label>
              <input 
                type="text" required value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain focus:ring-1 focus:ring-brand-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">SKU Code</label>
              <input 
                type="text" required value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain focus:ring-1 focus:ring-brand-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Category</label>
              <select 
                value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Supplier</label>
              <select 
                value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Reorder Level</label>
              <input 
                type="number" required min={0} value={formReorder}
                onChange={(e) => setFormReorder(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Unit Price ($)</label>
              <input 
                type="number" step="0.01" required min={0} value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              />
            </div>
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
        <div className="flex items-start gap-3 text-brand-textMain text-sm leading-relaxed">
          <AlertTriangle className="text-red-500 shrink-0" size={24} />
          <div>
            <p className="font-semibold text-base text-slate-800">Are you absolutely sure?</p>
            <p className="mt-1.5 text-brand-textMuted">
              This action will permanently delete <strong className="text-brand-textMain">{currentProduct?.name}</strong> (SKU: {currentProduct?.sku}) and cascade delete its complete historical stock transaction records.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
