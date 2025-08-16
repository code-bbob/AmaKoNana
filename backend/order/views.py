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
        
        # Debug logging
        print(f"PATCH request received for order {pk}")
        print(f"Request content type: {request.content_type}")
        print(f"Raw request data: {data}")
        print(f"Request data keys: {list(data.keys())}")
        
        # Handle FormData with items[index] format
        if hasattr(data, 'getlist') and any(key.startswith('items[') for key in data.keys()):
            print("Processing FormData format")
            # Parse FormData items format
            items_dict = {}
            regular_fields = {}
            
            for key, value in data.items():
                if key.startswith('items[') and ']' in key:
                    # Parse items[0]id, items[0]item, items[0]image format
                    parts = key.split(']', 1)
                    index_part = parts[0].replace('items[', '')
                    field_name = parts[1] if len(parts) > 1 else ''
                    
                    try:
                        index = int(index_part)
                        if index not in items_dict:
                            items_dict[index] = {}
                        
                        # Convert id to integer if it's the id field
                        if field_name == 'id':
                            try:
                                value = int(value)
                            except (ValueError, TypeError):
                                continue
                        
                        items_dict[index][field_name] = value
                        print(f"FormData item[{index}][{field_name}] = {value}")
                    except (ValueError, IndexError):
                        continue
                else:
                    regular_fields[key] = value
            
            # Convert items_dict to list format
            if items_dict:
                items_list = []
                for i in sorted(items_dict.keys()):
                    items_list.append(items_dict[i])
                regular_fields['items'] = items_list
                print(f"Converted items list: {items_list}")
            
            data = regular_fields
        else:
            print("Processing JSON format")
            print(f"Items data: {data.get('items', 'No items key found')}")
        
        print(f"Final data being sent to serializer: {data}")
        
        serializer = OrderSerializer(order, data=data, partial=True)
        if serializer.is_valid():
            print("Serializer is valid, saving...")
            result = serializer.save()
            print(f"Save result: {result}")
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            print(f"Serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, *args, **kwargs):
        order = Order.objects.get(pk=pk, enterprise=request.user.person.enterprise)
        serializer = OrderSerializer(order)
        serializer.delete(order)
        return Response(status=status.HTTP_204_NO_CONTENT)
