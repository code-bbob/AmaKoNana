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


class OrderReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None, *args, **kwargs):
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        search = request.GET.get('search')
        status_filter = request.GET.get('status')

        orders = Order.objects.filter(enterprise=request.user.person.enterprise, branch=branch)

        # Date filtering (by due_date if provided else received_date)
        if start_date and end_date:
            orders = orders.filter(due_date__range=[start_date, end_date])
        elif start_date:
            orders = orders.filter(due_date__gte=start_date)
        elif end_date:
            orders = orders.filter(due_date__lte=end_date)

        if search:
            orders_name = orders.filter(customer_name__icontains=search)
            orders_phone = orders.filter(customer_phone__icontains=search)
            orders_bill = orders.filter(bill_no__icontains=search)
            orders_items = OrderItem.objects.filter(order__in=orders, item__icontains=search)
            orders = (orders_name | orders_phone | orders_bill | orders.filter(id__in=orders_items.values_list('order_id', flat=True))).distinct()

        if status_filter:
            orders = orders.filter(status=status_filter)

        orders = orders.order_by('due_date', 'received_date')

        serializer = OrderSerializer(orders, many=True)
        serialized = serializer.data

        total_amount = 0.0
        total_advance = 0.0
        total_remaining = 0.0
        outstanding_total = 0.0

        enriched = []
        for o in orders:
            adv = o.advance_received or 0.0
            rem = o.remaining_received or 0.0
            total = o.total_amount or 0.0
            net_received = adv + rem
            outstanding = max(total - net_received, 0.0)
            total_amount += total
            total_advance += adv
            total_remaining += rem
            outstanding_total += outstanding
        
        # Pair computed fields with serialized dicts
        for base in serialized:
            adv = base.get('advance_received') or 0.0
            rem = base.get('remaining_received') or 0.0
            total = base.get('total_amount') or 0.0
            net_received = adv + rem
            outstanding = max(total - net_received, 0.0)
            base['net_received'] = net_received
            base['outstanding'] = outstanding
            enriched.append(base)

        data = {
            'orders': enriched,
            'totals': {
                'count': len(enriched),
                'total_amount': total_amount,
                'total_advance': total_advance,
                'total_remaining': total_remaining,
                'net_received': total_advance + total_remaining,
                'total_outstanding': outstanding_total,
            }
        }
        return Response(data, status=status.HTTP_200_OK)
