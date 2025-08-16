from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Order, OrderItem
from rest_framework.status import HTTP_404_NOT_FOUND
from .serializers import OrderSerializer, OrderItemSerializer
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
# Create your views here.



class OrderView(APIView):
    
    permission_classes = [IsAuthenticated]
    def get(self, request, branch=None,pk=None, *args, **kwargs):

        if pk:
            order = Order.objects.get(id=pk, enterprise = request.user.person.enterprise)
            serializer=OrderSerializer(order)
            return Response(serializer.data)
        orders = Order.objects.filter(enterprise=request.user.person.enterprise, branch=branch)
        branch = request.user.person.branch
        if branch:
            orders = orders.filter(branch=branch)
        status = request.GET.get('status', None)
        if status:
            orders = orders.filter(status=status)

        orders = orders.order_by('-due_date')
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
        data = request.data.copy()
        serializer = OrderSerializer(order, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, *args, **kwargs):
        order = Order.objects.get(pk=pk, enterprise=request.user.person.enterprise)
        serializer = OrderSerializer(order)
        serializer.delete(order)
        return Response(status=status.HTTP_204_NO_CONTENT)
