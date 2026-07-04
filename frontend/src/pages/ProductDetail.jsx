import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRightLeft, 
  Calendar, 
  Package, 
  User, 
  DollarSign, 
  AlertTriangle,
  Plus,
  Activity,
  Inbox
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [txType, setTxType] = useState('IN');
  const [txQty, setTxQty] = useState(1);
  const [txReason, setTxReason] = useState('restock');
  const [submitting, setSubmitting] = useState(false);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/products/${id}`);
      if (res.data?.success) {
        setProduct(res.data.data.product);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to retrieve product details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const toastId = toast.loading('Logging stock movement...');

    try {
      const res = await api.post('/transactions/', {
        product_id: parseInt(id),
        type: txType,
        quantity: parseInt(txQty),
        reason: txReason
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Transaction recorded.', { id: toastId });
        setIsTxOpen(false);
        fetchProductDetails(); // Refresh product quantities & transaction logs
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Failed to submit transaction.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // When type changes, adjust default reason
  useEffect(() => {
    setTxReason(txType === 'IN' ? 'restock' : 'sale');
  }, [txType]);

  if (loading && !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Activity className="animate-spin text-brand-accent" size={24} />
        <span className="text-sm text-brand-textMuted">Loading product file...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center flex flex-col items-center justify-center">
        <Inbox className="text-brand-textLight mb-2" size={48} />
        <h2 className="text-lg font-bold text-brand-textMain">Product Not Found</h2>
        <p className="text-sm text-brand-textMuted mt-1">The catalog item with ID "{id}" does not exist.</p>
        <Button variant="secondary" onClick={() => navigate('/products')} className="mt-4 gap-2">
          <ArrowLeft size={16} />
          <span>Back to Catalog</span>
        </Button>
      </div>
    );
  }

  const columns = [
    { key: 'timestamp', header: 'Date & Time', sortable: false, render: (row) => (
      <span className="text-xs text-brand-textMuted">
        {new Date(row.timestamp).toLocaleString()}
      </span>
    )},
    { key: 'type', header: 'Type', sortable: false, render: (row) => (
      <Badge variant={row.type === 'IN' ? 'green' : 'red'}>
        {row.type}
      </Badge>
    )},
    { key: 'quantity', header: 'Quantity Changed', sortable: false, render: (row) => (
      <span className="font-semibold">{row.quantity} Units</span>
    )},
    { key: 'reason', header: 'Reason', sortable: false },
    { key: 'performed_by', header: 'Logged By (User ID)', sortable: false, render: (row) => (
      <span className="text-brand-textMuted text-xs">ID: {row.performed_by || '—'}</span>
    )}
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* Back link */}
      <div>
        <button 
          onClick={() => navigate('/products')}
          className="inline-flex items-center gap-1.5 text-sm text-brand-textMuted hover:text-brand-textMain transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Products</span>
        </button>
      </div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-brand-textMain">{product.name}</h1>
            <Badge variant={product.is_low_stock ? 'red' : 'green'} className="py-1 px-2.5">
              {product.is_low_stock ? 'Low Stock Alert' : 'In Stock'}
            </Badge>
          </div>
          <p className="text-xs font-mono text-brand-textMuted mt-1">SKU Code: {product.sku}</p>
        </div>
        <div>
          <Button variant="primary" onClick={() => setIsTxOpen(true)} className="gap-2">
            <Plus size={16} />
            <span>Record Transaction</span>
          </Button>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Product specifications */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card title="Product File">
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-brand-border pb-2.5">
                <dt className="text-brand-textMuted">Quantity in Stock</dt>
                <dd className={`font-bold ${product.is_low_stock ? 'text-red-600' : 'text-slate-800'}`}>
                  {product.quantity} Units
                </dd>
              </div>
              <div className="flex justify-between border-b border-brand-border pb-2.5">
                <dt className="text-brand-textMuted">Reorder Level Threshold</dt>
                <dd className="font-semibold text-brand-textMain">{product.reorder_level} Units</dd>
              </div>
              <div className="flex justify-between border-b border-brand-border pb-2.5">
                <dt className="text-brand-textMuted">Unit Price</dt>
                <dd className="font-semibold text-brand-textMain">${parseFloat(product.unit_price).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between border-b border-brand-border pb-2.5">
                <dt className="text-brand-textMuted">Stock Valuation</dt>
                <dd className="font-bold text-brand-accent">
                  ${(parseFloat(product.unit_price) * product.quantity).toFixed(2)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Classification & Vendor">
            <dl className="space-y-4 text-sm">
              <div className="flex flex-col gap-1 border-b border-brand-border pb-2.5">
                <dt className="text-brand-textMuted text-xs uppercase tracking-wider">Category</dt>
                <dd className="font-medium text-brand-textMain">
                  {product.category?.name || <span className="text-brand-textLight">None assigned</span>}
                </dd>
                {product.category?.description && (
                  <dd className="text-xs text-brand-textMuted mt-0.5">{product.category.description}</dd>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-brand-textMuted text-xs uppercase tracking-wider">Supplier Vendor</dt>
                <dd className="font-medium text-brand-textMain">
                  {product.supplier?.name || <span className="text-brand-textLight">None assigned</span>}
                </dd>
                {product.supplier?.contact_email && (
                  <dd className="text-xs text-brand-textMuted mt-0.5">Email: {product.supplier.contact_email}</dd>
                )}
                {product.supplier?.phone && (
                  <dd className="text-xs text-brand-textMuted">Phone: {product.supplier.phone}</dd>
                )}
              </div>
            </dl>
          </Card>
        </div>

        {/* Right Col - Full transaction history */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-brand-textMain">Recent Stock Movements</h2>
          <Table 
            columns={columns}
            data={product.recent_transactions || []}
            totalPages={1}
          />
          {(product.recent_transactions || []).length === 0 && (
            <div className="bg-brand-card border border-brand-border rounded-lg p-10 text-center flex flex-col items-center justify-center">
              <ArrowRightLeft className="text-brand-textLight mb-2" size={32} />
              <p className="text-sm font-semibold text-brand-textMain">No transactions logged</p>
              <p className="text-xs text-brand-textMuted mt-1">This product has not experienced any recorded stock movements.</p>
            </div>
          )}
        </div>

      </div>

      {/* Record transaction modal */}
      <Modal 
        isOpen={isTxOpen} 
        onClose={() => setIsTxOpen(false)}
        title="Record Stock Movement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsTxOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleTxSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Record Transaction'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleTxSubmit} className="space-y-4">
          
          {/* IN / OUT Type toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Movement Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => setTxType('IN')}
                className={`py-2 px-3 text-sm font-medium border rounded-md transition-colors ${
                  txType === 'IN' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold' 
                    : 'bg-white border-brand-border text-brand-textMuted hover:bg-slate-50'
                }`}
              >
                Stock IN (Intake)
              </button>
              <button 
                type="button"
                onClick={() => setTxType('OUT')}
                className={`py-2 px-3 text-sm font-medium border rounded-md transition-colors ${
                  txType === 'OUT' 
                    ? 'bg-red-50 border-red-300 text-red-700 font-semibold' 
                    : 'bg-white border-brand-border text-brand-textMuted hover:bg-slate-50'
                }`}
              >
                Stock OUT (Sale / Defect)
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Quantity (Units)</label>
            <input 
              type="number" required min={1} value={txQty}
              onChange={(e) => setTxQty(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain focus:ring-1 focus:ring-brand-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Reason</label>
            <select
              value={txReason}
              onChange={(e) => setTxReason(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
            >
              {txType === 'IN' ? (
                <>
                  <option value="restock">Restock (Supplier Delivery)</option>
                  <option value="initial stock">Initial Stock intake</option>
                  <option value="correction">Inventory Audit Correction</option>
                </>
              ) : (
                <>
                  <option value="sale">Outbound Sale</option>
                  <option value="damaged">Damaged / Defect waste</option>
                  <option value="internal use">Internal Business use</option>
                  <option value="correction">Inventory Audit Correction</option>
                </>
              )}
            </select>
          </div>
        </form>
      </Modal>

    </div>
  );
}
