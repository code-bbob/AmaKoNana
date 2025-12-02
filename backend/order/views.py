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
from django.utils import timezone
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


class OrderOverviewView(APIView):
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

class OrderReportVie(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None, *args, **kwargs):
        # Similar to OrderOverviewView but tailored for report generation
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            report_start_date = start_date
            report_end_date = end_date
        elif start_date and not end_date:
            report_start_date = start_date
            report_end_date = timezone.now().date() 
        elif not start_date and end_date:
            report_start_date = '2000-01-01'  # Arbitrary early date
            report_end_date = end_date
        else:
            report_start_date = timezone.now().date()
            report_end_date = timezone.now().date()
        enterprise = request.user.person.enterprise
        list = []
        total_cash_amount = 0
        total_card_amount = 0
        total_online_amount = 0
        total_income = 0
        orders = Order.objects.filter(enterprise=enterprise, received_date__range=(report_start_date, report_end_date))
        if branch:
            orders = orders.filter(branch=branch)
        for order in orders:
            desc = "Order's Advanced Payment for: "
            for o in order.items.all():
                desc += f"{o.item}), \n "
            order.description = desc.rstrip(", ")
            list.append({
                'id': order.id,
                'bill_no': order.bill_no,
                'net_amount': order.advance_received,
                'description': order.description,
                'method': order.advance_method,
                'type': 'Order',
                'date': order.received_date
            })
            if order.advance_method == 'cash':
                total_cash_amount += order.advance_received or 0
            elif order.advance_method == 'card':
                total_card_amount += order.advance_received or 0
            elif order.advance_method == 'online':
                total_online_amount += order.advance_received or 0
            total_income += order.advance_received or 0

        remaining_payment_orders = Order.objects.filter(enterprise=enterprise, remaining_received_date__range=(report_start_date, report_end_date))
        if branch:
            remaining_payment_orders = remaining_payment_orders.filter(branch=branch)

        for order in remaining_payment_orders:
            desc = "Order's Remaining Payment for: "
            for o in order.items.all():
                desc += f"{o.item}), \n "
            order.description = desc.rstrip(", ")
            list.append({
                'id': order.id,
                'bill_no': order.bill_no,
                'net_amount': order.remaining_received,
                'description': order.description,
                'method': order.remaining_received_method,
                'type': 'Order',
                'date': order.remaining_received_date
            })
            if order.remaining_received_method == 'cash':
                total_cash_amount += order.remaining_received or 0
            elif order.remaining_received_method == 'card':
                total_card_amount += order.remaining_received or 0
            elif order.remaining_received_method == 'online':
                total_online_amount += order.remaining_received or 0
            total_income += order.remaining_received or 0

        report = {
            'transactions' : list,
            'total_cash_amount': total_cash_amount,
            'total_online_amount': total_online_amount,
            'total_card_amount': total_card_amount,
            'total_income': total_income,
        }
        return Response(report)

 