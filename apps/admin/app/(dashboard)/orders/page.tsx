'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, deliveryApi } from '../../../lib/api';
import { Eye, Truck, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-orange-100 text-orange-700',
  PICKED_UP: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function OrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [assignModal, setAssignModal] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => ordersApi.getAll({ status: statusFilter === 'ALL' ? undefined : statusFilter, page: 1, limit: 50 }).then((r) => r.data),
  });

  const { data: ridersData } = useQuery({
    queryKey: ['riders-available'],
    queryFn: () => deliveryApi.getAvailableRiders().then((r) => r.data),
    enabled: !!assignModal,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => ordersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Order status updated'); qc.invalidateQueries({ queryKey: ['orders'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, riderId }: any) => deliveryApi.assignRider(orderId, riderId),
    onSuccess: () => { toast.success('Rider assigned!'); setAssignModal(null); qc.invalidateQueries({ queryKey: ['orders'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const orders = data?.orders || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">Manage all customer orders</p>
        </div>
        <div className="text-sm text-gray-500">Total: {data?.total || 0}</div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['ALL', ...STATUS_FLOW, 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Assign Rider Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">Assign Rider to Order #{assignModal.orderNumber}</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(ridersData?.riders || []).map((rider: any) => (
                <button
                  key={rider.id}
                  onClick={() => assignMutation.mutate({ orderId: assignModal.id, riderId: rider.id })}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {rider.user?.fullName?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{rider.user?.fullName}</div>
                    <div className="text-xs text-gray-400">{rider.user?.phone}</div>
                  </div>
                </button>
              ))}
              {!ridersData?.riders?.length && <p className="text-center text-gray-400 py-4">No available riders</p>}
            </div>
            <button className="btn-secondary w-full mt-4" onClick={() => setAssignModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Order #{selectedOrder.orderNumber}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{selectedOrder.customer?.user?.fullName}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{selectedOrder.customer?.user?.phone}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className={`badge ${STATUS_COLORS[selectedOrder.status]}`}>{selectedOrder.status}</span></div>
                <div><span className="text-gray-500">Payment:</span> <span className="font-medium">{selectedOrder.paymentMethod}</span></div>
                <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.city}</span></div>
              </div>
              <hr />
              <div>
                <p className="text-sm font-semibold mb-2">Items</p>
                {selectedOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.productName} × {item.quantity}</span>
                    <span className="font-medium">₩{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <hr />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₩{selectedOrder.subtotal?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>₩{selectedOrder.deliveryFee?.toLocaleString()}</span></div>
                {selectedOrder.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₩{selectedOrder.discount?.toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>₩{selectedOrder.total?.toLocaleString()}</span></div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              {STATUS_FLOW.indexOf(selectedOrder.status) < STATUS_FLOW.length - 1 && selectedOrder.status !== 'CANCELLED' && (
                <button
                  className="btn-primary text-sm"
                  onClick={() => {
                    const next = STATUS_FLOW[STATUS_FLOW.indexOf(selectedOrder.status) + 1];
                    updateStatusMutation.mutate({ id: selectedOrder.id, status: next });
                    setSelectedOrder((o: any) => ({ ...o, status: next }));
                  }}
                >
                  Mark as {STATUS_FLOW[STATUS_FLOW.indexOf(selectedOrder.status) + 1]}
                </button>
              )}
              {selectedOrder.status === 'CONFIRMED' && (
                <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => { setAssignModal(selectedOrder); setSelectedOrder(null); }}>
                  <Truck className="w-3 h-3" /> Assign Rider
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Order #', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="table-td font-mono font-semibold">#{order.orderNumber}</td>
                    <td className="table-td">
                      <div className="font-medium text-sm">{order.customer?.user?.fullName}</div>
                      <div className="text-xs text-gray-400">{order.customer?.user?.phone}</div>
                    </td>
                    <td className="table-td text-sm">{order.items?.length} items</td>
                    <td className="table-td font-bold">₩{order.total?.toLocaleString()}</td>
                    <td className="table-td">
                      <span className="badge bg-gray-100 text-gray-600 text-xs">{order.paymentMethod}</span>
                    </td>
                    <td className="table-td">
                      <span className={`badge text-xs ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="table-td text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="table-td">
                      <button
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                        onClick={() => setSelectedOrder(order)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
