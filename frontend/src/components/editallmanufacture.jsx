"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAxios from '@/utils/useAxios';
import Sidebar from '@/components/allsidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, ChevronsUpDown, Check, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from '@/components/ui/command';

function EditAllManufactureForm(){
  const { branchId, manufactureId } = useParams();
  const api = useAxios();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [openProduct, setOpenProduct] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    branch: branchId,
    manufacture_items: []
  });
  const [subLoading, setSubLoading] = useState(false);

  useEffect(()=>{
    const fetchData = async () => {
      try {
        const [prodRes, manuRes] = await Promise.all([
          api.get(`allinventory/product/branch/${branchId}/`),
          api.get(`allinventory/manufacture/${manufactureId}/`)
        ]);
        setProducts(prodRes.data);
        setFormData({
          date: manuRes.data.date,
            branch: manuRes.data.branch?.toString() || branchId,
            manufacture_items: (manuRes.data.manufacture_items || []).map(mi => ({
              ...mi,
              product: mi.product.toString(),
              quantity: mi.quantity.toString(),
              unit_cost: (products.find(p=>p.id === mi.product)?.cost_price || '')
            }))
        });
        setOpenProduct(new Array(manuRes.data.manufacture_items?.length || 0).fill(false));
        setLoading(false);
      } catch(e){
        console.error(e);
        setError('Failed to load manufacture');
        setLoading(false);
      }
    };
    fetchData();
  }, [manufactureId]);

  const handleManufactureChange = (index, e) => {
    const { name, value } = e.target;
    const items = [...formData.manufacture_items];
    items[index] = { ...items[index], [name]: value };
    setFormData({ ...formData, manufacture_items: items });
  };

  const handleProductChange = (index, value) => {
    if (value === 'new') return; // creation omitted here
    const items = [...formData.manufacture_items];
    const match = products.find(p=>p.id.toString() === value);
    items[index] = { ...items[index], product: value, unit_cost: match?.cost_price || '' };
    setFormData({ ...formData, manufacture_items: items });
    const open = [...openProduct]; open[index]=false; setOpenProduct(open);
  };

  const handleAddItem = () => {
    setFormData(prev => ({...prev, manufacture_items: [...prev.manufacture_items, { product:'', quantity:'', unit_cost:'' }]}));
    setOpenProduct(prev => [...prev, false]);
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({...prev, manufacture_items: prev.manufacture_items.filter((_,i)=> i!==index)}));
    setOpenProduct(prev => prev.filter((_,i)=> i!== index));
  };

  const calculateLineTotal = (u,q) => {
    if(!u || !q) return 0; return (parseFloat(u)*parseFloat(q)).toFixed(2);
  };

  const totalAmount = formData.manufacture_items.reduce((acc,i)=> acc + (parseFloat(i.unit_cost||0)*parseFloat(i.quantity||0)||0),0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubLoading(true);
    try {
      const payload = {
        ...formData,
        manufacture_items: formData.manufacture_items.map(it => ({
          product: it.product,
          quantity: it.quantity || 0
        }))
      }; // remove unit_cost not required by backend
      await api.patch(`allinventory/manufacture/${manufactureId}/`, payload);
      navigate(`/manufacture/branch/${branchId}`);
    } catch(e){
      console.error(e); setError('Update failed');
    } finally { setSubLoading(false);} }

  const handleDelete = async () => {
    if(!window.confirm('Delete this manufacture batch?')) return;
    try {
      await api.delete(`allinventory/manufacture/${manufactureId}/`);
      navigate(`/manufacture/branch/${branchId}`);
    } catch(e){ console.error(e); setError('Delete failed'); }
  };

  if(loading) return <div className='flex items-center justify-center h-screen bg-slate-900 text-white'>Loading...</div>;
  return (
    <div className='flex min-h-screen bg-gradient-to-br from-slate-900 to-slate-800'>
      <Sidebar className='hidden lg:block w-64 flex-shrink-0' />
      <div className='flex-grow p-4 lg:p-6 lg:ml-64 overflow-auto'>
        <div className='max-w-4xl mx-auto'>
          <Button onClick={()=>navigate(`/manufacture/branch/${branchId}`)} variant='outline' className='mb-6 px-4 py-2 text-black border-white hover:bg-gray-700 hover:text-white'>
            <ArrowLeft className='mr-2 h-4 w-4'/> Back
          </Button>
          <div className='bg-slate-800 p-6 rounded-lg shadow-lg'>
            <h2 className='text-2xl lg:text-3xl font-bold mb-6 text-white'>Edit Manufacture</h2>
            {error && <p className='text-red-400 mb-4'>{error}</p>}
            <form onSubmit={handleSubmit} className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='flex flex-col'>
                  <Label htmlFor='date' className='text-sm font-medium text-white mb-2'>Date</Label>
                  <Input type='date' id='date' name='date' value={formData.date} onChange={(e)=> setFormData({...formData, date:e.target.value})} className='bg-slate-700 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500' required />
                </div>
              </div>
              <h3 className='text-xl font-semibold mb-2 text-white'>Items</h3>
              {formData.manufacture_items.map((item,index)=>(
                <div key={index} className='bg-slate-700 p-4 rounded-md shadow mb-4'>
                  <h4 className='text-lg font-semibold mb-4 text-white'>Item {index+1}</h4>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div className='flex flex-col'>
                      <Label className='text-sm font-medium text-white mb-2'>Product</Label>
                      <Popover open={openProduct[index]} onOpenChange={(open)=>{ const o=[...openProduct]; o[index]=open; setOpenProduct(o); }}>
                        <PopoverTrigger asChild>
                          <Button variant='outline' role='combobox' aria-expanded={openProduct[index]} className='w-full justify-between bg-slate-600 border-slate-500 text-white hover:bg-slate-500'>
                            {item.product ? products.find(p=> p.id.toString()===item.product)?.name : 'Select a product...'}
                            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50'/>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-full p-0 bg-slate-700 border-slate-600'>
                          <Command className='bg-slate-700 border-slate-600'>
                            <CommandInput placeholder='Search product...' className='bg-slate-700 text-white'/>
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {products.map(prod => (
                                  <CommandItem key={prod.id} onSelect={()=>handleProductChange(index, prod.id.toString())} className='text-white hover:bg-slate-600'>
                                    <Check className={cn('mr-2 h-4 w-4', item.product === prod.id.toString() ? 'opacity-100':'opacity-0')} />
                                    {prod.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className='flex flex-col'>
                      <Label className='text-sm font-medium text-white mb-2'>Quantity</Label>
                      <Input type='number' name='quantity' value={item.quantity} onChange={(e)=>handleManufactureChange(index,e)} className='bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500' required />
                    </div>
                    <div className='flex flex-col'>
                      <Label className='text-sm font-medium text-white mb-2'>Unit Cost</Label>
                      <Input type='number' name='unit_cost' value={item.unit_cost} onChange={(e)=>handleManufactureChange(index,e)} className='bg-slate-600 border-slate-500 text-white focus:ring-purple-500 focus:border-purple-500' required />
                    </div>
                    <div className='flex flex-col'>
                      <Label className='text-sm font-medium text-white mb-2'>Line Total</Label>
                      <Input disabled value={calculateLineTotal(item.unit_cost, item.quantity)} className='bg-slate-600 border-slate-500 text-white' />
                    </div>
                  </div>
                  {formData.manufacture_items.length>1 && (
                    <Button type='button' variant='destructive' size='sm' className='mt-4 bg-red-600 hover:bg-red-700 text-white' onClick={()=>handleRemoveItem(index)}>
                      <Trash2 className='w-4 h-4 mr-2'/> Remove Item
                    </Button>
                  )}
                </div>
              ))}
              <Button type='button' onClick={handleAddItem} className='w-full bg-purple-600 hover:bg-purple-700 text-white'>
                <PlusCircle className='w-4 h-4 mr-2'/> Add Another Item
              </Button>
              <div className='text-right text-white font-bold text-lg'>Total: Rs. {totalAmount.toLocaleString()}</div>
              <Button type='submit' disabled={subLoading} className='w-full bg-green-600 hover:bg-green-700 text-white'>
                {subLoading ? 'Updating...' : 'Update Manufacture'}
              </Button>
              <Button type='button' onClick={handleDelete} className='w-full bg-red-600 hover:bg-red-700 text-white mt-4'>Delete Manufacture</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditAllManufactureForm;
