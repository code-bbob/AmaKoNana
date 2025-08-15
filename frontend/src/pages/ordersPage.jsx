"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/allsidebar';
import useAxios from '@/utils/useAxios';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Edit2 } from 'lucide-react';

function OrdersPage(){
  const { branchId } = useParams();
  const api = useAxios();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageData, setPageData] = useState({ next: null, previous: null, count: 0 });
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = async (url=null) => {
    try {
      setLoading(true);
  const endpoint = url || `order/branch/${branchId}/${statusFilter ? `?status=${statusFilter}`: ''}`;
      const res = await api.get(endpoint);
      setOrders(res.data.results || res.data || []);
      setPageData({ next: res.data.next, previous: res.data.previous, count: res.data.count });
    } catch(err){
      console.error(err);
      setError('Failed to load orders');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ fetchOrders(); }, [branchId, statusFilter]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar />
      <div className="flex-grow p-4 lg:p-6 lg:ml-64 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button onClick={() => navigate(`/branch/${branchId}`)} variant="outline" className="px-4 py-2 text-black border-white hover:bg-gray-700 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => navigate(`/orders/form/branch/${branchId}`)} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> New Order
            </Button>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-white">Orders</h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <div className="mb-4 flex gap-4 items-center">
              <select value={statusFilter} onChange={(e)=> setStatusFilter(e.target.value)} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="prepared">Prepared</option>
                <option value="dispatched">Dispatched</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
            {loading ? (<p className="text-slate-300">Loading...</p>) : (
              <div className="space-y-4">
                {orders.length === 0 && <p className="text-slate-400">No orders found.</p>}
                {orders.map(order => (
                  <div key={order.id} className="bg-slate-700 p-4 rounded-md shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-white font-semibold">{order.customer_name} <span className="text-xs text-slate-400">({order.customer_phone})</span></p>
                      <p className="text-slate-300 text-sm">Status: <span className="capitalize">{order.status}</span> | Due: {order.due_date || 'N/A'}</p>
                      <p className="text-slate-400 text-xs">Advance: {order.advance_amount ?? '-'} / Total: {order.total_amount ?? '-'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-slate-500 text-white hover:bg-slate-600" onClick={()=> navigate(`/orders/branch/${branchId}/editform/${order.id}`)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-6">
              <Button disabled={!pageData.previous} onClick={()=> fetchOrders(pageData.previous)} variant="outline" className="text-white border-slate-600 hover:bg-slate-700">Previous</Button>
              <Button disabled={!pageData.next} onClick={()=> fetchOrders(pageData.next)} variant="outline" className="text-white border-slate-600 hover:bg-slate-700">Next</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default OrdersPage;
