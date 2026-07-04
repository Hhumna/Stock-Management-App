import React, { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Download, 
  Plus, 
  Search, 
  Calendar, 
  Filter, 
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

export default function Transactions() {
  // Data State
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(15);
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal forms
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [formProduct, setFormProduct] = useState('');
  const [formType, setFormType] = useState('IN');
  const [formQty, setFormQty] = useState(1);
  const [formReason, setFormReason] = useState('restock');
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial select lists
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await api.get('/products/?per_page=100');
        setProducts(res.data?.data?.products || []);
      } catch (error) {
        console.error('Failed to load products list:', error);
      }
    };
    loadProducts();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = `/transactions/?page=${page}&per_page=${perPage}`;
      if (selectedProductId) url += `&product_id=${selectedProductId}`;
      if (selectedType) url += `&type=${selectedType}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setTransactions(res.data.data.transactions || []);
        setTotalPages(res.data.data.pages || 1);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch transaction logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, selectedProductId, selectedType, startDate, endDate]);

  // Adjust default reason based on transaction type IN/OUT
  useEffect(() => {
    setFormReason(formType === 'IN' ? 'restock' : 'sale');
  }, [formType]);

  const handleOpenRecord = () => {
    setFormProduct(products[0]?.id || '');
    setFormType('IN');
    setFormQty(1);
    setFormReason('restock');
    setIsRecordOpen(true);
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!formProduct) {
      toast.error('Please select a product.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Logging transaction...');

    try {
      const response = await api.post('/transactions/', {
        product_id: parseInt(formProduct),
        type: formType,
        quantity: parseInt(formQty),
        reason: formReason
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Transaction recorded.', { id: toastId });
        setIsRecordOpen(false);
        fetchTransactions(); // reload logs
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Failed to submit transaction.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = async () => {
    const toastId = toast.loading('Generating transactions CSV report...');
    try {
      let url = '/transactions/export/csv?';
      if (selectedProductId) url += `product_id=${selectedProductId}&`;
      if (selectedType) url += `type=${selectedType}&`;
      if (startDate) url += `start_date=${startDate}&`;
      if (endDate) url += `end_date=${endDate}&`;

      const response = await api.get(url, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `transactions_export_${today}.csv`);
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('CSV Download complete!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to export CSV transactions.', { id: toastId });
    }
  };

  const columns = [
    { key: 'timestamp', header: 'Date', sortable: false, render: (row) => (
      <span className="text-xs text-brand-textMuted font-mono">
        {new Date(row.timestamp).toLocaleString()}
      </span>
    )},
    { key: 'product', header: 'Product Item', sortable: false, render: (row) => {
      const prod = products.find(p => p.id === row.product_id);
      return prod ? (
        <div>
          <div className="font-semibold text-brand-textMain">{prod.name}</div>
          <div className="text-[10px] font-mono text-brand-textLight">SKU: {prod.sku}</div>
        </div>
      ) : (
        <span className="text-brand-textLight">ID: {row.product_id}</span>
      );
    }},
    { key: 'type', header: 'Type', sortable: false, render: (row) => (
      <Badge variant={row.type === 'IN' ? 'green' : 'red'}>
        {row.type}
      </Badge>
    )},
    { key: 'quantity', header: 'Quantity Changed', sortable: false, render: (row) => (
      <span className="font-bold">{row.quantity} Units</span>
    )},
    { key: 'reason', header: 'Reason', sortable: false },
    { key: 'performed_by', header: 'Performed By', sortable: false, render: (row) => (
      <span className="text-xs text-brand-textMuted">User ID: {row.performed_by || 'System'}</span>
    )}
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-textMain">Stock Transactions</h1>
          <p className="text-sm text-brand-textMuted mt-1">Audit and record movements of warehouse stock items.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportCSV} className="gap-2">
            <Download size={16} />
            <span>Export CSV</span>
          </Button>
          <Button variant="primary" onClick={handleOpenRecord} className="gap-2">
            <Plus size={16} />
            <span>Record Transaction</span>
          </Button>
        </div>
      </div>

      {/* Filters form */}
      <Card title="Logs Filters" subtitle="Narrow down your transaction history view." className="py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          
          {/* Product Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => { setSelectedProductId(e.target.value); setPage(1); }}
              className="block w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <option value="">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider">Movement Type</label>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
              className="block w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <option value="">All Movements</option>
              <option value="IN">IN (Stock Intake)</option>
              <option value="OUT">OUT (Stock Dispatch)</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider">Start Date</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="block w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider">End Date</label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="block w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>
        </div>
      </Card>

      {/* Main Table view */}
      {loading && transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3">
          <Activity className="animate-spin text-brand-accent" size={24} />
          <span className="text-sm text-brand-textMuted">Loading audit trail...</span>
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={transactions}
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
          {transactions.length === 0 && (
            <div className="bg-white border border-brand-border rounded-lg p-12 text-center flex flex-col items-center justify-center">
              <Inbox className="text-brand-textLight mb-2" size={36} />
              <h3 className="font-semibold text-brand-textMain">No Transactions Found</h3>
              <p className="text-xs text-brand-textMuted mt-1">Try relaxing your filter query parameters to see historical logs.</p>
            </div>
          )}
        </>
      )}

      {/* ── Record Transaction Modal ── */}
      <Modal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title="Record Stock Movement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRecordOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleRecordSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Record Transaction'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4">
          
          {/* Select Product */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Select Product</label>
            <select
              value={formProduct}
              onChange={(e) => setFormProduct(e.target.value)}
              required
              className="block w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain"
            >
              <option value="">Choose item...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>[{p.sku}] {p.name} (Current: {p.quantity} units)</option>
              ))}
            </select>
          </div>

          {/* IN / OUT Type toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => setFormType('IN')}
                className={`py-2 px-3 text-sm font-medium border rounded-md transition-colors ${
                  formType === 'IN' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold' 
                    : 'bg-white border-brand-border text-brand-textMuted hover:bg-slate-50'
                }`}
              >
                Stock IN (Intake)
              </button>
              <button 
                type="button"
                onClick={() => setFormType('OUT')}
                className={`py-2 px-3 text-sm font-medium border rounded-md transition-colors ${
                  formType === 'OUT' 
                    ? 'bg-red-50 border-red-300 text-red-700 font-semibold' 
                    : 'bg-white border-brand-border text-brand-textMuted hover:bg-slate-50'
                }`}
              >
                Stock OUT (Dispatch)
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Quantity (Units)</label>
            <input 
              type="number" required min={1} value={formQty}
              onChange={(e) => setFormQty(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain focus:ring-1 focus:ring-brand-accent"
            />
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Reason</label>
            <select
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-textMain"
            >
              {formType === 'IN' ? (
                <>
                  <option value="restock">Restock (Supplier Delivery)</option>
                  <option value="initial stock">Initial Stock Intake</option>
                  <option value="correction">Inventory Audit Correction</option>
                  <option value="other">Other Inbound Reason</option>
                </>
              ) : (
                <>
                  <option value="sale">Outbound Sale</option>
                  <option value="damaged">Damaged / Defect waste</option>
                  <option value="internal use">Internal Business use</option>
                  <option value="correction">Inventory Audit Correction</option>
                  <option value="other">Other Outbound Reason</option>
                </>
              )}
            </select>
          </div>
        </form>
      </Modal>

    </div>
  );
}
