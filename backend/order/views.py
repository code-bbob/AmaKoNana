from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Order, OrderItem
from rest_framework.status import HTTP_404_NOT_FOUND
from .serializers import OrderSerializer, OrderItemSerializer
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from allinventory.models import IncentiveProduct
from allinventory.serializers import IncentiveProductSerializer
# Create your views here.



class OrderView(APIView):
    
    permission_classes = [IsAuthenticated]
    def get(self, request, branch=None,pk=None, *args, **kwargs):

        if pk:
            order = Order.objects.get(id=pk, enterprise = request.user.person.enterprise)
            serializer=OrderSerializer(order)
            return Response(serializer.data)
        
        start_date = request.GET.get('start_date', None)
        end_date = request.GET.get('end_date', None)
        search = request.GET.get('search', None)
        orders = Order.objects.filter(enterprise=request.user.person.enterprise, branch=branch)
        if start_date and end_date:
            orders = Order.objects.filter(enterprise=request.user.person.enterprise, branch=branch, due_date__range=[start_date, end_date])
        elif start_date:
            orders = Order.objects.filter(enterprise=request.user.person.enterprise, branch=branch, due_date__gte=start_date)
        elif end_date:
            orders = Order.objects.filter(enterprise=request.user.person.enterprise, branch=branch, due_date__lte=end_date)
        if search:
            orders_cname = orders.filter(customer_name__icontains=search)
            orders_cphone = orders.filter(customer_phone__icontains=search)
            orders_items = OrderItem.objects.filter(order__in=orders, item__icontains=search)
            orders_bills = orders.filter(bill_number__icontains=search)
            orders = orders_cname | orders_cphone | orders_bills | Order.objects.filter(id__in=orders_items.values_list('order_id', flat=True))

        
        branch = request.user.person.branch
        if branch:
            orders = orders.filter(branch=branch)
        status = request.GET.get('status', None)
        if status:
            orders = orders.filter(status=status)

        orders = orders.order_by('due_date')
        paginator = PageNumberPagination()
        paginator.page_size = 5  # Set the page size here
        paginated_orders = paginator.paginate_queryset(orders, request)
        serializer = OrderSerializer(paginated_orders, many=True)
        return paginator.get_paginated_response(serializer.data)
        



    def post(self, request, *args, **kwargs):
        # Ensure enterprise is set server-side
        data = request.data.copy()
        data['enterprise'] = request.user.person.enterprise.id
        serializer = OrderSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk, *args, **kwargs):
        order = Order.objects.get(pk=pk, enterprise=request.user.person.enterprise)
        serializer = OrderSerializer(order, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, *args, **kwargs):
        order = Order.objects.get(pk=pk, enterprise=request.user.person.enterprise)
        serializer = OrderSerializer(order)
        serializer.delete(order)
        return Response(status=status.HTTP_204_NO_CONTENT)

class IncentiveProductView(APIView):
    
    permission_classes = [IsAuthenticated]
    def get(self, request, branch=None,pk=None, *args, **kwargs):

        if pk:
            incentive_product = IncentiveProduct.objects.get(id=pk, enterprise = request.user.person.enterprise)
            serializer=IncentiveProductSerializer(incentive_product)
            return Response(serializer.data)
        incentive_products = IncentiveProduct.objects.filter(enterprise=request.user.person.enterprise, branch=branch)
        branch = request.user.person.branch
        if branch:
            incentive_products = incentive_products.filter(branch=branch)

        incentive_products = incentive_products.order_by('name')
        paginator = PageNumberPagination()
        paginator.page_size = 5  # Set the page size here
        paginated_incentive_products = paginator.paginate_queryset(incentive_products, request)
        serializer = IncentiveProductSerializer(paginated_incentive_products, many=True)
        return paginator.get_paginated_response(serializer.data)
        



    def post(self, request, *args, **kwargs):
        # Ensure enterprise is set server-side
        data = request.data.copy()
        data['enterprise'] = request.user.person.enterprise.id
        serializer = IncentiveProductSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk, *args, **kwargs):
        incentive_product = IncentiveProduct.objects.get(pk=pk, enterprise=request.user.person.enterprise)
        serializer = IncentiveProductSerializer(incentive_product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, *args, **kwargs):
        incentive_product = IncentiveProduct.objects.get(pk=pk, enterprise=request.user.person.enterprise)
        serializer = IncentiveProductSerializer(incentive_product)
        serializer.delete(incentive_product)
        return Response(status=status.HTTP_204_NO_CONTENT)