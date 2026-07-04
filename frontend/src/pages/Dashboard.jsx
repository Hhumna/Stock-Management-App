import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  AlertTriangle, 
  DollarSign, 
  ArrowRightLeft,
  Activity,
  Plus,
  ArrowRight,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    stockValue: 0,
    lowStockCount: 0,
    txnsThisMonth: 0
  });

  // Modal State
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockReason, setRestockReason] = useState('restock');
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch low stock
      const lowStockRes = await api.get('/products/low-stock');
      const lowStockData = lowStockRes.data?.data?.products || [];
      setLowStockProducts(lowStockData.slice(0, 5));

      // 2. Fetch all products (to calculate total stock value and counts)
      // Since it's a dev scaffold, fetching per_page=100 will cover our catalog.
      const productsRes = await api.get('/products/?per_page=100');
      const allProducts = productsRes.data?.data?.products || [];
      setProducts(allProducts);

      const totalVal = allProducts.reduce((sum, p) => {
        const price = parseFloat(p.unit_price) || 0;
        return sum + (price * p.quantity);
      }, 0);

      // 3. Fetch recent transactions (last 50 for the chart and recent panel)
      const txnsRes = await api.get('/transactions/?per_page=50');
      const allTxns = txnsRes.data?.data?.transactions || [];
      setRecentTransactions(allTxns.slice(0, 10));

      // Calculate transactions this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthTxns = allTxns.filter(t => {
        const date = new Date(t.timestamp);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      setStats({
        totalProducts: productsRes.data?.data?.total || allProducts.length,
        stockValue: totalVal,
        lowStockCount: lowStockRes.data?.data?.total || lowStockData.length,
        txnsThisMonth: monthTxns.length
      });

      // 4. Group transactions for Recharts (last 30 days)
      const chartDataMap = {};
      
      // Initialize map with last 7 days to guarantee labels if transactions are sparse
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        chartDataMap[label] = { date: label, IN: 0, OUT: 0 };
      }

      // Populate from actual transactions
      allTxns.forEach(t => {
        const d = new Date(t.timestamp);
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        // If within 30 days
        const diffTime = Math.abs(new Date() - d);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 30) {
          if (!chartDataMap[label]) {
            chartDataMap[label] = { date: label, IN: 0, OUT: 0 };
          }
          if (t.type === 'IN') {
            chartDataMap[label].IN += t.quantity;
          } else {
            chartDataMap[label].OUT += t.quantity;
          }
        }
      });

      // Sort chronological
      const sortedChartData = Object.values(chartDataMap).sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      });
      setChartData(sortedChartData);

    } catch (error) {
      console.error('Dashboard load failed:', error);
      toast.error('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  // Restock action
  const handleOpenRestock = (product) => {
    setSelectedProduct(product);
    setRestockQty(10);
    setRestockReason('restock');
    setIsRestockOpen(true);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setSubmitting(true);
    const toastId = toast.loading(`Restocking ${selectedProduct.name}...`);

    try {
      const response = await api.post('/transactions/', {
        product_id: selectedProduct.id,
        type: 'IN',
        quantity: parseInt(restockQty),
        reason: restockReason
      });

      if (response.data?.success) {
        toast.success(`Successfully added ${restockQty} units to ${selectedProduct.name}`, { id: toastId });
        setIsRestockOpen(false);
        fetchDashboardData(); // Reload stats
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Failed to submit transaction.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const lowStockColumns = [
    { key: 'sku', header: 'SKU', sortable: false },
    { key: 'name', header: 'Product Name', sortable: false },
    { key: 'quantity', header: 'Qty', sortable: false, render: (row) => (
      <span className="font-semibold text-red-600">{row.quantity}</span>
    )},
    { key: 'reorder_level', header: 'Reorder Level', sortable: false },
    { key: 'action', header: 'Action', sortable: false, render: (row) => (
      <Button 
        variant="primary" 
        onClick={() => handleOpenRestock(row)}
        className="py-1 px-3.5 text-xs font-semibold"
      >
        Restock
      </Button>
    )}
  ];

  const recentTxnColumns = [
    { key: 'timestamp', header: 'Date', sortable: false, render: (row) => (
      <span className="text-brand-textMuted text-xs">
        {new Date(row.timestamp).toLocaleDateString()} {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    )},
    { key: 'sku', header: 'Product SKU', sortable: false, render: (row) => {
      const prod = products.find(p => p.id === row.product_id);
      return <span className="font-mono text-xs">{prod ? prod.sku : `ID: ${row.product_id}`}</span>;
    }},
    { key: 'type', header: 'Type', sortable: false, render: (row) => (
      <Badge variant={row.type === 'IN' ? 'green' : 'red'}>
        {row.type}
      </Badge>
    )},
    { key: 'quantity', header: 'Quantity', sortable: false, render: (row) => (
      <span className="font-semibold">{row.quantity}</span>
    )},
    { key: 'reason', header: 'Reason', sortable: false }
  ];

  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Activity className="animate-spin text-brand-accent" size={32} />
        <p className="text-sm text-brand-textMuted font-medium">Loading warehouse dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-brand-textMain">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="text-sm text-brand-textMuted mt-1">Here is a quick overview of your warehouse catalog operations.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchDashboardData} className="gap-2">
            <Activity size={16} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Products */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Total Products</p>
              <h3 className="text-3xl font-bold text-brand-textMain mt-2">
                {stats.totalProducts}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-brand-accent border border-emerald-100">
              <Package size={22} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border text-xs text-brand-textMuted flex justify-between">
            <span>Manage product items</span>
            <span className="font-semibold text-brand-accent cursor-pointer hover:underline" onClick={() => navigate('/products')}>View Catalog</span>
          </div>
        </Card>

        {/* Total Stock Value */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Total Value</p>
              <h3 className="text-3xl font-bold text-brand-textMain mt-2">
                ${stats.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
              <DollarSign size={22} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border text-xs text-brand-textMuted">
            <span>Aggregated catalog valuation</span>
          </div>
        </Card>

        {/* Low Stock count */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Low Stock</p>
              <h3 className="text-3xl font-bold text-red-600 mt-2">
                {stats.lowStockCount}
              </h3>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-red-600 border border-red-100">
              <AlertTriangle size={22} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border text-xs text-brand-textMuted flex justify-between">
            <span>Require immediate restock</span>
            {stats.lowStockCount > 0 && <span className="font-semibold text-red-600">Action Required</span>}
          </div>
        </Card>

        {/* Transactions this month */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Monthly Activity</p>
              <h3 className="text-3xl font-bold text-brand-textMain mt-2">
                {stats.txnsThisMonth}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
              <ArrowRightLeft size={22} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border text-xs text-brand-textMuted flex justify-between">
            <span>Transactions logged</span>
            <span className="font-semibold text-amber-600 cursor-pointer hover:underline" onClick={() => navigate('/transactions')}>View Logs</span>
          </div>
        </Card>
      </div>

      {/* Chart Section */}
      <Card title="Stock Movements (IN vs OUT)" subtitle="Daily activity levels representing inbound delivery logs and outbound sales transactions.">
        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip 
                contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px' }}
                itemStyle={{ fontSize: '13px' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="IN" name="Stock In (IN)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" />
              <Area type="monotone" dataKey="OUT" name="Stock Out (OUT)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Dashboard bottom half */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Low Stock Alerts */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-brand-textMain">Low Stock Alerts</h2>
          <Table 
            columns={lowStockColumns}
            data={lowStockProducts}
            totalPages={1}
          />
          {lowStockProducts.length === 0 && (
            <div className="bg-white border border-brand-border rounded-lg p-8 flex flex-col items-center justify-center text-center">
              <Inbox className="text-brand-textLight mb-2" size={32} />
              <p className="text-sm font-semibold text-brand-textMain">All items fully stocked</p>
              <p className="text-xs text-brand-textMuted mt-1">No products are currently under their designated reorder thresholds.</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-brand-textMain">Recent Activity</h2>
          <div className="bg-brand-card border border-brand-border rounded-lg shadow-card divide-y divide-brand-border overflow-hidden">
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-brand-textMuted flex flex-col items-center justify-center">
                <ArrowRightLeft className="text-brand-textLight mb-2" size={24} />
                <span>No recent transactions logged.</span>
              </div>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-brand-textMain">
                        {t.type === 'IN' ? '+' : '-'}{t.quantity} Units
                      </span>
                      <Badge variant={t.type === 'IN' ? 'green' : 'red'}>
                        {t.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-brand-textMuted mt-1">
                      {t.reason || 'No description'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-brand-textLight">
                      {new Date(t.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Restock Form Modal */}
      <Modal 
        isOpen={isRestockOpen} 
        onClose={() => setIsRestockOpen(false)}
        title={selectedProduct ? `Restock Product: ${selectedProduct.name}` : 'Restock Product'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRestockOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleRestockSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Record Inflow'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4">
          {selectedProduct && (
            <div className="bg-slate-50 border border-brand-border rounded p-4 text-xs text-brand-textMuted space-y-1">
              <p><strong className="text-brand-textMain">SKU:</strong> {selectedProduct.sku}</p>
              <p><strong className="text-brand-textMain">Current Quantity:</strong> {selectedProduct.quantity}</p>
              <p><strong className="text-brand-textMain">Reorder Level:</strong> {selectedProduct.reorder_level}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Quantity to Inflow</label>
            <input 
              type="number" 
              required
              min={1}
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Reason</label>
            <select
              value={restockReason}
              onChange={(e) => setRestockReason(e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
            >
              <option value="restock">Restock (Supplier Delivery)</option>
              <option value="initial stock">Initial Stock Intake</option>
              <option value="correction">Inventory Audit Correction</option>
            </select>
          </div>
        </form>
      </Modal>

    </div>
  );
}
