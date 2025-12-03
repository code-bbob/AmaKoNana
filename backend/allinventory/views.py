from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from rest_framework.views import APIView
from .models import Product,Brand
from .models import IncentiveProduct
from enterprise.models import Branch
from .serializers import ProductSerializer,BrandSerializer, ManufactureSerializer
from .serializers import IncentiveProductSerializer
from rest_framework.decorators import api_view
from barcode import EAN13
from barcode.writer import SVGWriter
import io
from django.http import FileResponse
from rest_framework.permissions import IsAuthenticated
from .models import ManufactureItem, Manufacture

# Create your views here.

class ProductView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk=None,branch=None):
        if pk:
            try:
                product = Product.objects.get(pk=pk)
                serializer = ProductSerializer(product, context={'request': request})
                return Response(serializer.data)
            except Product.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)
        search = request.GET.get('search')

        if branch:
            products = Product.objects.filter(enterprise=request.user.person.enterprise,branch=branch)
            serializer = ProductSerializer(products, many=True, context={'request': request})
            return Response(serializer.data)
        if search:
            products = Product.objects.filter(enterprise=request.user.person.enterprise,name__icontains=search)
            serializer = ProductSerializer(products, many=True, context={'request': request})
            return Response(serializer.data)
        
        products = Product.objects.filter(enterprise=request.user.person.enterprise)
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)
    

    def post(self, request, format=None):
        data = request.data
        data['enterprise'] = request.user.person.enterprise.id
        serializer = ProductSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
    
    def patch(self,request,pk,format=None):
        data = request.data
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        data['enterprise'] = request.user.person.enterprise.id
        
        try:
            product = Product.objects.get(id=pk)
        except Product.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = ProductSerializer(product,data=data,partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            old_stock = product.stock if product.stock else 0
            product.stock = product.count * product.selling_price
            product.brand.stock = product.brand.stock - old_stock + product.stock
            product.brand.save()
            product.save()
            return Response(serializer.data)
        return Response(serializer.errors)
    
    def delete(self,request,pk,format=None):
        product = Product.objects.get(id=pk)
        product.delete()
        return Response("Deleted")
    
class BrandView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request,pk=None,branch=None,format=None):
        if pk:
            brand = Brand.objects.get(id=pk)
            products = Product.objects.filter(brand = brand)
            if products:
                serializer = ProductSerializer(products,many=True, context={'request': request})
                return Response(serializer.data)
            else:
                return Response([])
        if branch:
            brands = Brand.objects.filter(branch=branch)
            serializer = BrandSerializer(brands,many=True, context={'request': request})
            return Response(serializer.data)
        
        # search = request.GET.get('search')
        # if search:
        #     brands = Brand.objects.filter(enterprise=request.user.person.enterprise,branch=request.user.person.branch,name__icontains=search)
        #     serializer = BrandSerializer(brands, many=True)
        #     return Response(serializer.data)
        brands = Brand.objects.filter(enterprise=request.user.person.enterprise)
        serializer = BrandSerializer(brands, many=True, context={'request': request})
        return Response(serializer.data)
    
    def post(self, request, format=None):
        data = request.data
        data['enterprise'] = request.user.person.enterprise.id  
        serializer = BrandSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
    
    def patch(self,request,pk,format=None):
        data = request.data
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        data['enterprise'] = request.user.person.enterprise.id
        
        try:
            brand = Brand.objects.get(id=pk)
        except Brand.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = BrandSerializer(brand,data=data,partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
    
    def delete(self,request,pk,format=None):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        try:
            brand = Brand.objects.get(id=pk)
            brand.delete()
            return Response("Deleted")
        except Brand.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        


@api_view(['GET'])
def generate_barcode(request,pk=None):
    if pk:
        uid = Product.objects.get(id=pk).uid
        # print(uid)

    barcode = EAN13(uid, writer=SVGWriter())
    
    buffer = io.BytesIO()
    barcode.write(buffer)
    buffer.seek(0)

    # print("BARCODE GENERATED")
    return FileResponse(buffer, content_type='image/svg+xml')


class MergeBrandView(APIView):
    def post(self,request,selfbranch,mergebranch,format=None):
        
        branch = Branch.objects.get(id=mergebranch)
        print(branch.name)
        # return Response("Merged")

        for brand in Brand.objects.filter(branch=branch):
            if brand.name in Brand.objects.filter(branch_id=selfbranch).values_list('name',flat=True):
                continue
            Brand.objects.create(name=brand.name,enterprise=brand.enterprise,branch_id=selfbranch)
        return Response("Merged")

class MergeProductBrandView(APIView):
    def post(self,request,selfbranch,mergebranch,brand,format=None):
        print("MERGING PRODUCTS")
        brand = Brand.objects.get(id=brand)
        products = Product.objects.filter(branch_id=mergebranch,brand__name__iexact=brand.name)
        print("THERESASDSAD ",products) 
        for product in Product.objects.filter(branch_id=mergebranch,brand__name__iexact=brand.name):
            print(product)
            if Product.objects.filter(branch_id=selfbranch, brand=brand, name__iexact=product.name).exists():
                print("HERE")
                continue
            p = Product.objects.create(name=product.name,enterprise=product.enterprise,branch_id=selfbranch,cost_price=product.cost_price,selling_price=product.selling_price,brand_id=brand.id,uid = product.uid, print_pattern=product.print_pattern)
            print("CREATED",p)
            
        return Response("Merged")

class ManufactureView(APIView):

    def get(self, request, pk=None, branch=None):

        product = request.GET.get('search')

        manufactures = Manufacture.objects.filter(branch=branch, enterprise=request.user.person.enterprise)
        manufactures = manufactures.order_by('-id')
        if pk:
            try:
                manufacture = Manufacture.objects.get(id=pk)
                serializer = ManufactureSerializer(manufacture)
                return Response(serializer.data)
            except Manufacture.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)

        # manufactures = Manufacture.objects.filter(enterprise=request.user.person.enterprise, branch=branch)
        if product:
            manufactures = Manufacture.objects.filter(manufacture_items__product__name__icontains=product,branch = branch, enterprise=request.user.person.enterprise)

        paginator = PageNumberPagination()
        paginator.page_size = 10  # Set the page size here
        paginated_manufactures = paginator.paginate_queryset(manufactures, request)

        serializer = ManufactureSerializer(paginated_manufactures, many=True)
        return paginator.get_paginated_response(serializer.data)
    


    def post(self, request, format=None):
        request.data['enterprise'] = request.user.person.enterprise.id
        serializer = ManufactureSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)

    def patch(self, request, pk, format=None):
        try:
            manufacture = Manufacture.objects.get(id=pk)
        except Manufacture.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = ManufactureSerializer(manufacture, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)

    def delete(self, request, pk, format=None):
        try:
            manufacture = Manufacture.objects.get(id=pk)
            serializer = ManufactureSerializer(manufacture)
            serializer.delete(manufacture)
            return Response("Deleted")
        except Manufacture.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)


class IncentiveProductView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None, pk=None, *args, **kwargs):
        if pk:
            try:
                incentive_product = IncentiveProduct.objects.get(
                    id=pk, enterprise=request.user.person.enterprise
                )
            except IncentiveProduct.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)
            serializer = IncentiveProductSerializer(incentive_product)
            return Response(serializer.data)

        incentive_products = IncentiveProduct.objects.filter(
            enterprise=request.user.person.enterprise, branch=branch
        )
        user_branch = request.user.person.branch
        if user_branch:
            incentive_products = incentive_products.filter(branch=user_branch)

        incentive_products = incentive_products.order_by('name')
        paginator = PageNumberPagination()
        paginator.page_size = 1000 # Fix this later
        paginated = paginator.paginate_queryset(incentive_products, request)
        serializer = IncentiveProductSerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        data['enterprise'] = request.user.person.enterprise.id
        serializer = IncentiveProductSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk, *args, **kwargs):
        try:
            incentive_product = IncentiveProduct.objects.get(
                pk=pk, enterprise=request.user.person.enterprise
            )
        except IncentiveProduct.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = IncentiveProductSerializer(incentive_product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, *args, **kwargs):
        try:
            incentive_product = IncentiveProduct.objects.get(
                pk=pk, enterprise=request.user.person.enterprise
            )
        except IncentiveProduct.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = IncentiveProductSerializer(incentive_product)
        serializer.delete(incentive_product)
        return Response(status=status.HTTP_204_NO_CONTENT)