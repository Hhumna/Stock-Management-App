import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Activity, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function Suppliers() {
  const { user } = useAuth();

  // State
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form Values
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const url = search ? `/suppliers/?search=${encodeURIComponent(search)}` : '/suppliers/';
      const res = await api.get(url);
      if (res.data?.success) {
        setSuppliers(res.data.data.suppliers || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setCurrentSupplier(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    setCurrentSupplier(supplier);
    setFormName(supplier.name);
    setFormEmail(supplier.contact_email);
    setFormPhone(supplier.phone);
    setFormAddress(supplier.address || '');
    setIsEditOpen(true);
  };

  const handleOpenDelete = (supplier) => {
    setCurrentSupplier(supplier);
    setIsDeleteOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const toastId = toast.loading(`Creating supplier: ${formName}...`);

    try {
      const response = await api.post('/suppliers/', {
        name: formName,
        contact_email: formEmail,
        phone: formPhone,
        address: formAddress
      });
      if (response.data?.success) {
        toast.success('Supplier added successfully!', { id: toastId });
        setIsAddOpen(false);
        fetchSuppliers();
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Failed to create supplier.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentSupplier) return;

    setSubmitting(true);
    const toastId = toast.loading(`Updating supplier...`);

    try {
      const response = await api.put(`/suppliers/${currentSupplier.id}`, {
        name: formName,
        contact_email: formEmail,
        phone: formPhone,
        address: formAddress
      });
      if (response.data?.success) {
        toast.success('Supplier details updated successfully!', { id: toastId });
        setIsEditOpen(false);
        fetchSuppliers();
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Failed to update supplier.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!currentSupplier) return;

    setSubmitting(true);
    const toastId = toast.loading(`Deleting supplier...`);

    try {
      const response = await api.delete(`/suppliers/${currentSupplier.id}`);
      if (response.data?.success) {
        toast.success(response.data.message || 'Supplier deleted.', { id: toastId });
        setIsDeleteOpen(false);
        fetchSuppliers();
      }
    } catch (error) {
      console.error(error);
      // Cleanly toast the backend's 409 conflict error when supplier is supplying active products
      const errMsg = error.response?.data?.error || error.message || 'Failed to delete supplier.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'id', header: 'ID', sortable: false },
    { key: 'name', header: 'Supplier Name', sortable: false, render: (row) => (
      <span className="font-semibold text-brand-textMain">{row.name}</span>
    )},
    { key: 'contact_email', header: 'Contact Email', sortable: false },
    { key: 'phone', header: 'Phone', sortable: false },
    { key: 'address', header: 'Address', sortable: false, render: (row) => (
      <span className="text-brand-textMuted max-w-sm truncate block">
        {row.address || <span className="text-brand-textLight italic">No address</span>}
      </span>
    )},
    { key: 'actions', header: 'Actions', sortable: false, render: (row) => (
      <div className="flex gap-2">
        {user?.role === 'admin' && (
          <button 
            onClick={() => handleOpenEdit(row)}
            className="text-brand-textMuted hover:text-blue-600 p-1"
            title="Edit Supplier"
          >
            <Edit2 size={16} />
          </button>
        )}
        {user?.role === 'admin' && (
          <button 
            onClick={() => handleOpenDelete(row)}
            className="text-brand-textMuted hover:text-red-600 p-1"
            title="Delete Supplier"
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
          <h1 className="text-2xl font-bold tracking-tight text-brand-textMain">Suppliers Registry</h1>
          <p className="text-sm text-brand-textMuted mt-1">Manage vendor suppliers supplying your inventory products.</p>
        </div>
        {user?.role === 'admin' && (
          <Button variant="primary" onClick={handleOpenAdd} className="gap-2">
            <Plus size={16} />
            <span>Add Supplier</span>
          </Button>
        )}
      </div>

      {/* Search filter card */}
      <Card className="py-4">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textLight">
            <Search size={18} />
          </div>
          <input 
            type="text"
            placeholder="Search suppliers by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain placeholder-brand-textLight focus:outline-none focus:ring-1 focus:ring-brand-accent"
          />
        </div>
      </Card>

      {/* Main suppliers table */}
      {loading && suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[25vh] gap-3">
          <Activity className="animate-spin text-brand-accent" size={24} />
          <span className="text-sm text-brand-textMuted">Loading vendor data...</span>
        </div>
      ) : (
        <Table 
          columns={columns}
          data={suppliers}
          totalPages={1}
        />
      )}

      {/* ── Add Supplier Modal ── */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Supplier"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleAddSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Supplier'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Supplier Name</label>
            <input 
              type="text" required placeholder="Logitech Inc" value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Contact Email</label>
              <input 
                type="email" required placeholder="support@logitech.com" value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Phone</label>
              <input 
                type="text" required placeholder="+1-800-555-9000" value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Address</label>
            <textarea
              placeholder="7600 Gateway Blvd, Newark, CA 94560"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain h-20 resize-none"
            />
          </div>
        </form>
      </Modal>

      {/* ── Edit Supplier Modal ── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Supplier Details"
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
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Supplier Name</label>
            <input 
              type="text" required value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Contact Email</label>
              <input 
                type="email" required value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Phone</label>
              <input 
                type="text" required value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Address</label>
            <textarea
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain h-20 resize-none"
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
            <p className="font-semibold text-base text-slate-800">Delete Supplier?</p>
            <p className="mt-1.5 text-brand-textMuted">
              This will permanently delete the supplier <strong className="text-brand-textMain">{currentSupplier?.name}</strong>.
            </p>
            <p className="text-xs text-red-600 font-medium mt-2 bg-red-50 border border-red-100 rounded p-2">
              Note: This action will fail with a Conflict error if any products reference this supplier.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
