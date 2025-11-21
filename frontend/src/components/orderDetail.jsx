"use client";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "@/components/allsidebar";
import useAxios from "@/utils/useAxios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Package, 
  DollarSign,
  Clock,
  Truck,
  Book
} from "lucide-react";
import { format } from "date-fns";

function OrderDetail() {
  const { branchId, orderId } = useParams();
  const navigate = useNavigate();
  const api = useAxios();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Helper to resolve media URLs
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
  const resolveMedia = (path) => {
    if (!path) return null;
    if (/^https?:/i.test(path)) return path;
    const resolvedUrl = `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`;
    console.log('Resolving media path:', path, '→', resolvedUrl);
    return resolvedUrl;
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`order/${orderId}/`);
        setOrderData(res.data);
      } catch (err) {
        setError("Failed to fetch order details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'prepared':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'dispatched':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
        <div className="flex-grow flex items-center justify-center lg:ml-64">
          <div className="text-white text-xl">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
        <div className="flex-grow flex items-center justify-center lg:ml-64">
          <div className="text-red-400 text-xl">{error || "Order not found"}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
        <div className="flex-grow p-6 lg:ml-64">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
            <div className="flex items-center gap-4 mb-4 lg:mb-0">
              <Button
                onClick={() => navigate(`/orders/branch/${branchId}`)}
                variant="outline"
                size="sm"
                className="border-slate-600 bg-slate-800/50 text-white hover:bg-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Button>
              <h1 className="text-3xl lg:text-4xl font-bold text-white">
                Order Details
              </h1>
            </div>
            <Button
              onClick={() => navigate(`/orders/branch/${branchId}/editform/${orderId}`)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Order
            </Button>
          </div>

          {/* Order Info Card */}
          <Card className="bg-slate-800/60 border-slate-700 mb-8">
            <CardHeader className="border-b border-slate-700/50">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <CardTitle className="text-2xl text-white">
                  Order #{orderId}
                </CardTitle>
                <Badge className={`${getStatusColor(orderData.status)} px-3 py-1 text-sm font-medium border`}>
                  {orderData.status?.charAt(0).toUpperCase() + orderData.status?.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Book className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Bill No.</p>
                    <p className="text-white font-medium">{orderData.bill_no}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <User className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Customer</p>
                    <p className="text-white font-medium">{orderData.customer_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Phone className="w-5 h-5 text-green-300" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Phone</p>
                    <p className="text-white font-medium">{orderData.customer_phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Due Date</p>
                    <p className="text-white font-medium">
                      {orderData.due_date ? format(new Date(orderData.due_date), 'dd MMM yyyy') : 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-300" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Received Date</p>
                    <p className="text-white font-medium">
                      {format(new Date(orderData.received_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {orderData.customer_address && (
                <div className="mt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <MapPin className="w-5 h-5 text-orange-300" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Delivery Address</p>
                      <p className="text-white font-medium">{orderData.customer_address}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="bg-slate-800/60 border-slate-700 mb-8">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Items ({orderData.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6">
                {orderData.items?.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-slate-700/40 rounded-xl p-6 border border-slate-600/30"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Image */}
                      <div className="flex-shrink-0">
                        {item.image ? (
                          <div 
                            className="relative group cursor-pointer"
                            onClick={() => {
                              setSelectedImage({
                                url: resolveMedia(item.image),
                                alt: item.item || 'Order item'
                              });
                            }}
                          >
                            <img
                              src={resolveMedia(item.image)}
                              alt={item.item || 'Order item'}
                              className="w-full lg:w-80 h-64 lg:h-80 object-cover rounded-xl border-2 border-slate-600 transition-transform duration-300 group-hover:scale-[1.02] shadow-lg"
                            />
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 text-slate-800 font-semibold transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                🔍 Click to zoom
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full lg:w-80 h-64 lg:h-80 bg-slate-600/50 rounded-xl border-2 border-dashed border-slate-500 flex items-center justify-center">
                            <div className="text-center">
                              <Package className="w-20 h-20 text-slate-400 mx-auto mb-2" />
                              <p className="text-slate-400 text-sm">No image available</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-grow space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-2">
                            {item.item || 'Unnamed Item'}
                          </h3>
                          {item.description && (
                            <p className="text-slate-300 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-slate-400">Quantity</p>
                            <p className="text-lg font-medium text-white">
                              {item.quantity || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Unit Price</p>
                            <p className="text-lg font-medium text-green-400">
                              {item.unit_price ? `₹${item.unit_price.toLocaleString()}` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Total</p>
                            <p className="text-lg font-bold text-green-400">
                              {item.unit_price && item.quantity 
                                ? `₹${(item.unit_price * item.quantity).toLocaleString()}` 
                                : 'N/A'
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Size</p>
                            <p className="text-lg font-medium text-white">
                              {item.size || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {item.notes && (
                          <div className="bg-slate-800/60 rounded-lg p-3">
                            <p className="text-sm text-slate-400 mb-1">Notes</p>
                            <p className="text-white">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card className="bg-slate-800/60 border-slate-700">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Advance Received:</span>
                  <span className="text-lg font-semibold text-blue-400">
                    Rs. {orderData.advance_received?.toLocaleString() || '0'}
                  </span>
                </div>
                
                {orderData.advance_method && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-300">Payment Method:</span>
                    <span className="text-white capitalize">
                      {orderData.advance_method.replace('_', ' ')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Remaining Received:</span>
                  <span className="text-lg font-semibold text-blue-400">
                    Rs. {orderData.remaining_received?.toLocaleString() || '0'}
                  </span>
                </div>

                {orderData.remaining_received_method && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-300">Remaining Payment Method:</span>
                    <span className="text-white capitalize">
                      {orderData.remaining_received_method.replace('_', ' ')}
                    </span>
                  </div>
                )}
                <Separator className="bg-slate-600" />
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-xl font-semibold text-white">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-400">
                    Rs. {orderData.total_amount?.toLocaleString() || '0'}
                  </span>
                </div>

                {orderData.total_amount && orderData.advance_received && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-300">Remaining Balance:</span>
                    <span className={`text-lg font-semibold ${
                      (orderData.total_amount - orderData.advance_received) > 0 
                        ? 'text-red-400' 
                        : 'text-green-400'
                    }`}>
                      Rs. {(orderData.total_amount - orderData.advance_received - orderData.remaining_received).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Image Modal */}
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
            style={{ zIndex: 9999 }}
          >
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="relative w-[95vw] h-[95vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.url}
                alt={selectedImage.alt}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                style={{ maxWidth: '95vw', maxHeight: '95vh' }}
              />
              
              {/* Close button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transition-all duration-200 shadow-lg transform hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Image info */}
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                <p className="text-lg font-medium">{selectedImage.alt}</p>
                <p className="text-sm text-slate-300">Click outside or the X to close</p>
              </div>
            </motion.div>
          </motion.div>
        )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4"
          style={{ zIndex: 10000 }}
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-colors shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white p-3 rounded-lg">
              <p className="text-lg font-medium">{selectedImage.alt}</p>
              <p className="text-sm text-slate-300">Click outside or the × to close</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default OrderDetail;
