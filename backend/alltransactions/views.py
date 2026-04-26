from django.shortcuts import render
from datetime import timedelta
from rest_framework.response import Response
from .serializers import PurchaseTransactionSerializer,PurchaseReturnSerializer,SalesTransactionSerializer,SalesReturnSerializer,VendorSerializer,VendorTransactionSerializer,StaffTransactionSerializer,StaffSerializer, ExpensesSerializer, WithdrawalSerializer, ClosingCashSerializer
from enterprise.models import Branch
from rest_framework.views import APIView
from rest_framework import status
from .models import PurchaseTransaction,SalesTransaction,Vendor,VendorTransactions,SalesReturn,Purchase,Sales,PurchaseReturn,StaffTransactions,Staff, Expenses
from rest_framework.permissions import IsAuthenticated
from allinventory.models import Product,Brand
from django.utils.dateparse import parse_date
from django.utils import timezone
from datetime import date, datetime,time
from django.utils.dateparse import parse_date
from rest_framework.pagination import PageNumberPagination
from django.utils.timezone import make_aware,localtime
from django.db.models import Max, Q, Sum
from .models import Customer
from django.db import transaction
from .models import Debtor, DebtorTransaction
from .serializers import DebtorSerializer, DebtorTransactionSerializer
import json
from alltransactions.models import StaffTransactionDetail,Withdrawal, ClosingCash
from order.models import Order
from .models import NCM, NCMTransaction
from .serializers import NCMSerializer, NCMTransactionSerializer


# Create your views here.

class PurchaseTransactionView(APIView):
    
    def post(self, request, format=None):
        user = request.user
        enterprise = user.person.enterprise.id
        request.data['enterprise'] = enterprise
        request.data['person'] = user.person
        serializer = PurchaseTransactionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request,pk=None,branch=None, format=None):
        print("HERE")
        user = request.user
        enterprise = user.person.enterprise
        search = request.GET.get('search')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        transactions = PurchaseTransaction.objects.filter(enterprise=enterprise)

        if pk:
            purchase_transaction = PurchaseTransaction.objects.get(id=pk)
            serializer = PurchaseTransactionSerializer(purchase_transaction)
            return Response(serializer.data)
        
        if branch:
            transactions = PurchaseTransaction.objects.filter(enterprise=enterprise,branch=branch)
        
        if search:
            phone_transactions = transactions.filter(purchase__product__name__startswith = search)
            vendor_trasactions = transactions.filter(vendor__name__icontains = search)
            bill_transactions = transactions.filter(bill_no__iexact = search)
            transactions = phone_transactions.union(vendor_trasactions,bill_transactions)
        
        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)

        if start_date and end_date:
            transactions = PurchaseTransaction.objects.filter(
                date__range=(start_date, end_date)
            )

        transactions = transactions.order_by('-date','-id')


        paginator = PageNumberPagination()
        paginator.page_size = 5  # Set the page size here
        paginated_transactions = paginator.paginate_queryset(transactions, request)

        serializer = PurchaseTransactionSerializer(paginated_transactions, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    def patch(self,request,pk,format=None):
        data = request.data
        data['enterprise'] = request.user.person.enterprise.id
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        try:
            purchase_transaction = PurchaseTransaction.objects.get(id=pk)
        except PurchaseTransaction.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = PurchaseTransactionSerializer(purchase_transaction,data=data,partial=True)
        #print("asdmnb",serializer)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
    
    def delete(self, request, pk, format=None):
        with transaction.atomic():
            role = request.user.person.role
            if role != "Admin":
                return Response("Unauthorized")

            purchase_transaction = PurchaseTransaction.objects.get(id=pk)
            purchases = purchase_transaction.purchase.all()
            returned_amount = 0

            # In‐memory caches
            products_cache = {}
            brands_cache = {}

            for purchase in purchases:
                if not purchase.returned:
                    # Cache and update product
                    pid = purchase.product.id
                    if pid not in products_cache:
                        products_cache[pid] = purchase.product
                    product = products_cache[pid]
                    product.count -= purchase.quantity
                    product.stock -= purchase.quantity * product.selling_price

                    # Cache and update brand
                    bid = product.brand.id
                    if bid not in brands_cache:
                        brands_cache[bid] = product.brand
                    brand = brands_cache[bid]
                    brand.count -= purchase.quantity
                    brand.stock -= purchase.quantity * product.selling_price
                else:
                    returned_amount += purchase.total_price

            # Save each unique product and brand once
            for product in products_cache.values():
                product.save()
            for brand in brands_cache.values():
                brand.save()
            
            # Remove any related vendor transactions
            vts = VendorTransactions.objects.filter(purchase_transaction=purchase_transaction)
            for vt in vts:
                vt.delete()

            purchase_transaction.delete()
            return Response("Deleted")


class SalesTransactionView(APIView):
        
    def post(self, request, format=None):
        user = request.user
        enterprise = user.person.enterprise
        request.data['enterprise'] = enterprise.id
        request.data['person'] = user.person
        serializer = SalesTransactionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    def get(self, request,pk=None,branch=None, format=None):
        user = request.user
        enterprise = user.person.enterprise
        search = request.GET.get('search')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        transactions = SalesTransaction.objects.filter(enterprise=enterprise)

        if pk:
            sales_transaction = SalesTransaction.objects.get(id=pk)
            serializer = SalesTransactionSerializer(sales_transaction)
            return Response(serializer.data)
        
        if branch:
            transactions = SalesTransaction.objects.filter(enterprise=enterprise,branch=branch)
        
        if search:
            product_transactions = transactions.filter(sales__product__name__istartswith = search)
            customer_transactions = transactions.filter(name__icontains = search)
            phone_transactions = transactions.filter(phone_number__icontains = search)
            bill_transactions = transactions.filter(bill_no__iexact = search)
            transactions = product_transactions.union(customer_transactions,phone_transactions,bill_transactions)
        
        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)

        if start_date and end_date:
            
            transactions = SalesTransaction.objects.filter(
                date__range=(start_date, end_date)
            )

        transactions = transactions.order_by('-date','-id')


        paginator = PageNumberPagination()
        paginator.page_size = 5  # Set the page size here
        paginated_transactions = paginator.paginate_queryset(transactions, request)

        serializer = SalesTransactionSerializer(paginated_transactions, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    def patch(self,request,pk,format=None):
        data = request.data
        data['enterprise'] = request.user.person.enterprise.id
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")

        try:
            sales_transaction = SalesTransaction.objects.get(id=pk)
        except SalesTransaction.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = SalesTransactionSerializer(sales_transaction,data=data,partial=True)
        #print("asdmnb",serializer)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
        
    @transaction.atomic
    def delete(self, request, pk, format=None):
        sales_transaction = SalesTransaction.objects.get(id=pk)
        role = request.user.person.role
        modify_stock = request.GET.get('flag')
        for sale in sales_transaction.sales.all():
            if sale.returned:
                # Handle returned sales
                return Response("Cannot delete transaction with returned sales")
        if role != "Admin":
            return Response("Unauthorized")
        if modify_stock == 'false':
            sales_transaction.delete()
            return Response("Deleted")

        sales = sales_transaction.sales.all()

        # Memory caches for products and brands
        products_cache = {}
        brands_cache = {}

        for sale in sales:
            # preserve your original check
            if not sale.returned:
                # cache and update product
                pid = sale.product.id
                if pid not in products_cache:
                    products_cache[pid] = sale.product
                product = products_cache[pid]
                product.count += sale.quantity
                product.stock += sale.product.selling_price * sale.quantity

                # cache and update brand
                bid = product.brand.id
                if bid not in brands_cache:
                    brands_cache[bid] = product.brand
                brand = brands_cache[bid]
                brand.count += sale.quantity
                brand.stock += sale.product.selling_price * sale.quantity

        # save each unique product and brand once
        print(products_cache)
        for product in products_cache.values():
            product.save()
        for brand in brands_cache.values():
            brand.save()

        dt = DebtorTransaction.objects.filter(all_sales_transaction=sales_transaction).first()
        if dt:
            dt.delete()
        
        nts = NCMTransaction.objects.filter(all_sales_transaction=sales_transaction)
        for nt in nts:
            nt.delete()
        
        ncmts = NCMTransaction.objects.filter(all_sales_transaction=sales_transaction)
        for ncmt in ncmts:
            ncmt.delete()

        sales_transaction.delete()
        return Response("Deleted")

        
class VendorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None, pk=None, *args, **kwargs):
        id = request.GET.get("id")
        role = request.user.person.role
        enterprise = request.user.person.enterprise
        
        # If pk is provided in URL, get specific vendor
        if pk:
            try:
                vendor = Vendor.objects.get(id=pk, enterprise=enterprise)
                if branch and vendor.branch != branch:
                    return Response({"error": "Vendor not found in specified branch"}, 
                                  status=status.HTTP_404_NOT_FOUND)
                serializer = VendorSerializer(vendor)
                return Response(serializer.data)
            except Vendor.DoesNotExist:
                return Response({"error": "Vendor not found"}, 
                              status=status.HTTP_404_NOT_FOUND)
        
        # If id is provided in query params, get specific vendor
        if id:
            try:
                vendor = Vendor.objects.get(id=id, enterprise=enterprise)
                if branch and vendor.branch != branch:
                    return Response({"error": "Vendor not found in specified branch"}, 
                                  status=status.HTTP_404_NOT_FOUND)
                serializer = VendorSerializer(vendor)
                return Response(serializer.data)
            except Vendor.DoesNotExist:
                return Response({"error": "Vendor not found"}, 
                              status=status.HTTP_404_NOT_FOUND)
        
        # Get all vendors for the enterprise
        vendors = Vendor.objects.filter(enterprise=enterprise)
        
        # Filter by branch if provided
        if branch:
            vendors = vendors.filter(branch=branch)
            
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data)
    
    def post(self, request, *args, **kwargs):
        data = request.data
        data["enterprise"] = request.user.person.enterprise.id
        serializer = VendorSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk=None, branch=None, *args, **kwargs):
        role = request.user.person.role
        if role != "Admin":
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        enterprise = request.user.person.enterprise
        
        if not pk:
            return Response({"error": "Vendor ID is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            vendor = Vendor.objects.get(id=pk, enterprise=enterprise)
            
            # If branch is specified, verify vendor belongs to that branch
            if branch and vendor.branch != branch:
                return Response({"error": "Vendor not found in specified branch"}, 
                              status=status.HTTP_404_NOT_FOUND)
            
            vendor.delete()
            return Response({"message": "Vendor deleted successfully"}, 
                          status=status.HTTP_200_OK)
            
        except Vendor.DoesNotExist:
            return Response({"error": "Vendor not found"}, 
                          status=status.HTTP_404_NOT_FOUND)
    
class VendorTransactionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self,request,branch=None,pk=None):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        if pk:
            vendor_transactions = VendorTransactions.objects.get(id=pk)
            serializer = VendorTransactionSerializer(vendor_transactions)
            return Response(serializer.data)
        query = request.GET.get('search')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        vendor_transactions = VendorTransactions.objects.filter(enterprise = request.user.person.enterprise)
        if branch:
            vendor_transactions = vendor_transactions.filter(branch = branch)
        if query:
            vendor_transactions_name = vendor_transactions.filter(vendor__name__icontains=query,enterprise = request.user.person.enterprise)
            vendor_transactions_brand = vendor_transactions.filter(vendor__brand__name__icontains=query,enterprise = request.user.person.enterprise)
            vendor_transactions = vendor_transactions_name.union(vendor_transactions_brand)

        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)

        if start_date and end_date:
            
            vendor_transactions = vendor_transactions.filter(
                date__range=(start_date, end_date)
            )

        vendor_transactions = vendor_transactions.order_by('-date','-id')

        paginator = PageNumberPagination()
        paginator.page_size = 5  # Set the page size here
        paginated_transactions = paginator.paginate_queryset(vendor_transactions, request)

        serializer = VendorTransactionSerializer(paginated_transactions, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    def post(self,request,*args, **kwargs):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        data = request.data
        data["enterprise"] = request.user.person.enterprise.id
        serializer = VendorTransactionSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self,request,pk):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        data = request.data
        data["enterprise"] = request.user.person.enterprise.id
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        vendor_transaction = VendorTransactions.objects.get(id=pk)
        serializer = VendorTransactionSerializer(vendor_transaction,data=data,partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
    
    def delete(self,request,pk):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        vendor_transaction = VendorTransactions.objects.get(id=pk)
        vendor_transaction.delete()
        return Response("Deleted")
    
class StatsView(APIView):
    # permission_classes = [IsAuthenticated]

    def get(self,request, branch=None):
        
        print("HERE")

        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        if not start_date or not end_date:
            today = timezone.now().date()
            start_date = today.replace(day=1)  # First day of the current month
            end_date = today
        
        start_date = parse_date(start_date) if isinstance(start_date, str) else start_date
        end_date = parse_date(end_date) if isinstance(end_date, str) else end_date


        enterprise = request.user.person.enterprise
    
        allstock = Product.objects.filter(enterprise = enterprise, branch=branch).count()
        allbrands = Brand.objects.filter(enterprise = enterprise, branch=branch).count()

        monthlypurchases = Purchase.objects.filter(purchase_transaction__enterprise = enterprise,purchase_transaction__branch=branch,purchase_transaction__date__range=(start_date, end_date))
        monthlysales = Sales.objects.filter(sales_transaction__enterprise = enterprise,sales_transaction__branch=branch,sales_transaction__date__range=(start_date, end_date))

        dailypurchases = Purchase.objects.filter(purchase_transaction__enterprise = enterprise,purchase_transaction__branch=branch,purchase_transaction__date = today)
        dailysales = Sales.objects.filter(sales_transaction__enterprise = enterprise,sales_transaction__branch=branch,sales_transaction__date = today)




        ptamt = 0
        dailyptamt = 0
        daily_profit = 0
        monthly_profit = 0

        for p in monthlypurchases:
            ptamt += p.total_price if p.total_price else 0

        for p in dailypurchases:
            dailyptamt += p.total_price if p.total_price else 0

        stamt = 0
        dailystamt = 0
        for sale in monthlysales:
           stamt += sale.total_price if sale.total_price else 0
           product = sale.product
           monthly_profit += sale.total_price - product.cost_price * sale.quantity

        for sale in dailysales:
            dailystamt += sale.total_price if sale.total_price else 0
            product = sale.product
            daily_profit += sale.total_price - product.cost_price * sale.quantity


        stat = { 
            "enterprise" : enterprise.name,
            "daily":{
                "purchases" : dailypurchases.count(),
                "dailyptamt":dailyptamt,
                "sales": dailysales.count(),
                "dailystamt":dailystamt,
                "profit": round(daily_profit,2)
            },
            "monthly":{
                "purchases" : monthlypurchases.count(),
                "ptamt":ptamt,
                "stamt":stamt,
                "sales": monthlysales.count(),
                "profit": round(monthly_profit,2)
            },
            "stock": allstock,
            "brands" : allbrands
        }
        return Response(stat)
    

class PurchaseReturnView(APIView):

    permission_classes = [IsAuthenticated]


    def get(self, request,branch=None):
        enterprise = request.user.person.enterprise
        search = request.GET.get('search')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        # Base QuerySet
        purchase_returns = PurchaseReturn.objects.filter(enterprise=enterprise)

        if branch:
            purchase_returns = purchase_returns.filter(branch=branch)

        # -----------------
        # 1) Search Filter
        # -----------------
        if search:
            name_filter = purchase_returns.filter(purchase_transaction__vendor__name__icontains=search)
            # amount_filter = purchase_returns.filter(amount__icontains=search)
            product_name = purchase_returns.filter(purchases__product__name__icontains=search)
            
            # union() will merge the two QuerySets without duplicates.
            purchase_returns = name_filter.union(product_name)
            if search.isdigit():
                id = purchase_returns.filter(id__icontains=search)
                purchase_returns = purchase_returns.union(id)

        # ---------------------
        # 2) Date Range Filter
        # ---------------------
        # Only attempt date range filter if both start and end date are provided
        if start_date and end_date:
            start_datetime = parse_date(start_date)
            end_datetime = parse_date(end_date)
            if start_datetime and end_datetime:
                # Combine with min and max time to capture full day range

                purchase_returns = purchase_returns.filter(
                    date__range=(start_datetime, end_datetime)
                )

        # ---------------------------------
        # 3) Sort and Paginate the Results
        # ---------------------------------
        purchase_returns = purchase_returns.order_by('-id')  # Sorting

        paginator = PageNumberPagination()
        paginator.page_size = 5  # Set your desired page size
        paginated_data = paginator.paginate_queryset(purchase_returns, request)

        serializer = PurchaseReturnSerializer(paginated_data, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    def post(self,request):
        data = request.data 
        user = request.user
        enterprise = user.person.enterprise
        data['enterprise'] = enterprise.id 
        if "date" in data:
            date_str = data["date"]
            # Assuming the format is 'YYYY-MM-DD'
            date_object = datetime.strptime(date_str, '%Y-%m-%d').date()
            data["date"] = date_object
        serializer = PurchaseReturnSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self,request,pk):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        purchase_return = PurchaseReturn.objects.filter(id=pk).first()
        purchase = purchase_return.purchases.first()
        purchase.returned = False
        serializer = PurchaseReturnSerializer()
        serializer.delete(purchase_return)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class SalesReportView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self,request,branch=None):
        
        search = request.GET.get('search')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        product = request.GET.get('product')

        sales = Sales.objects.filter(sales_transaction__enterprise = request.user.person.enterprise,returned = False)
        if branch:
            sales = sales.filter(sales_transaction__branch = branch)
        if search:
            first_date_of_month = timezone.now().date().replace(day=1)
            today = timezone.now().date()
            sales = sales.filter(product__brand__name__icontains = search)
            sales = sales.filter(sales_transaction__date__range=(first_date_of_month,today))
        
        if product:
            sales = sales.filter(product__name__startswith = product)


        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)
            sales = sales.filter(sales_transaction__date__range=(start_date, end_date))
        elif start_date and not end_date:
            start_date = parse_date(start_date)
            sales = sales.filter(sales_transaction__date__gte=start_date)
        elif end_date and not start_date:
            end_date = parse_date(end_date)
            sales = sales.filter(sales_transaction__date__lte=end_date)
        
        sales = sales.order_by('sales_transaction__date','sales_transaction__method','id') 
        if not search and not start_date and not end_date:
            sales = sales.filter(sales_transaction__date = timezone.now().date())

        count = sales.count()

        subtotal_sales = 0  # sum before discount
        total_discount = 0  # sum of per-line discount amounts
        cash_sales = 0
        card_sales = 0
        online_sales = 0
        st = []
        write_off = 0
        rows = []
        for sale in sales:
            if sale.sales_transaction.id not in st:
                write_off += sale.sales_transaction.total_amount - sale.sales_transaction.amount_paid
                st.append(sale.sales_transaction.id)
                cash_sales += sale.sales_transaction.cash_amount
                card_sales += sale.sales_transaction.card_amount
                online_sales += sale.sales_transaction.online_amount
            line_subtotal = (sale.unit_price or 0) * (sale.quantity or 0)
            line_discount = sale.discount or 0
            line_net = line_subtotal - line_discount
            subtotal_sales += line_subtotal
            total_discount += line_discount
            rows.append({
                "id": sale.id,
                "bill_no": sale.sales_transaction.bill_no,
                "date": sale.sales_transaction.date,
                "brand": sale.product.brand.name,
                "quantity": sale.quantity,
                "product": sale.product.name,
                "unit_price": sale.unit_price,
                "line_subtotal": line_subtotal,
                "discount": line_discount,
                "total_price": line_net,
                "method": sale.sales_transaction.method,
                "transaction_id": sale.sales_transaction.id
            })
        net_sales = subtotal_sales - total_discount
        rows.append({
            "count": count,
            "subtotal_sales": subtotal_sales,
            "total_discount": total_discount,
            "total_sales": net_sales,
            "write_off": write_off,
            "net_sales": net_sales - write_off,
            "cash_sales": cash_sales,
            "card_sales": card_sales,
            "online_sales": online_sales,
        })
        return Response(rows)

class PurchaseReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None):
        search = request.GET.get('search')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        product = request.GET.get('product')

        purchases = Purchase.objects.filter(purchase_transaction__enterprise=request.user.person.enterprise)
        if branch:
            purchases = purchases.filter(purchase_transaction__branch=branch)
        if search:
            first_date_of_month = timezone.now().date().replace(day=1)
            today = timezone.now().date()
            purchases = purchases.filter(product__brand__name__icontains=search)
            purchases = purchases.filter(purchase_transaction__date__range=(first_date_of_month, today))
        if product:
            purchases = purchases.filter(product__name__startswith=product)
        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)
            purchases = purchases.filter(purchase_transaction__date__range=(start_date, end_date))
        if not search and not start_date and not end_date:
            purchases = purchases.filter(purchase_transaction__date=timezone.now().date())
        
        purchases = purchases.order_by('purchase_transaction__date', 'id')

        count = purchases.count()
        subtotal_purchases = 0
        rows = []
        cash_purchases = 0
        for purchase in purchases:
            line_subtotal = (purchase.unit_price or 0) * (purchase.quantity or 0)
            subtotal_purchases += line_subtotal
            rows.append({
                'date': purchase.purchase_transaction.date,
                'brand': purchase.product.brand.name,
                'quantity': purchase.quantity,
                'product': purchase.product.name,
                'unit_price': purchase.unit_price,
                'line_subtotal': line_subtotal,
                'total_price': line_subtotal,
                'method': purchase.purchase_transaction.method,
                'transaction_id': purchase.purchase_transaction.id
            })
            if purchase.purchase_transaction.method == 'cash':
                cash_purchases += line_subtotal
        rows.append({
            'count': count,
            'subtotal_purchases': subtotal_purchases,
            'total_purchases': subtotal_purchases,
            'cash_purchases': cash_purchases,
        })
        return Response(rows)
     
class NextBillNo(APIView):
    def get(self,request):
        max_bill_no = SalesTransaction.objects.filter(
            enterprise=request.user.person.enterprise
        ).aggregate(max_bill_no=Max('bill_no'))['max_bill_no']
        
        if max_bill_no is None:
            next_bill_no = 1
        else:
            next_bill_no = max_bill_no + 1
        
        return Response({'bill_no':next_bill_no})
    
class StaffTransactionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self,request,pk=None,branch=None, staff_pk = None):
        if pk:
            staff_transactions = StaffTransactions.objects.get(id=pk)
            serializer = StaffTransactionSerializer(staff_transactions)
            return Response(serializer.data)

        query = request.GET.get('search')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        staff_transactions = StaffTransactions.objects.filter(enterprise = request.user.person.enterprise)
        if branch:
            staff_transactions = staff_transactions.filter(branch = branch)

        if staff_pk:
            staff_transactions = staff_transactions.filter(staff = staff_pk)
        
        if query:
            staff_transactions = staff_transactions.filter(
                Q(staff__name__icontains=query) | Q(staff__branch__name__icontains=query)
            )

        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)

        if start_date and end_date:
            
            staff_transactions = staff_transactions.filter(
                date__range=(start_date, end_date)
            )

        staff_transactions = staff_transactions.order_by('-id')

        paginator = PageNumberPagination()
        paginator.page_size = 5  # Set the page size here
        paginated_transactions = paginator.paginate_queryset(staff_transactions, request)

        serializer = StaffTransactionSerializer(paginated_transactions, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    def post(self,request,*args, **kwargs):
        data = request.data
        data["enterprise"] = request.user.person.enterprise.id
        role = request.user.person.role
        if role == "Staff":
            return Response("Unauthorized")
        serializer = StaffTransactionSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self,request,pk):
        data = request.data
        data["enterprise"] = request.user.person.enterprise.id
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        staff_transaction = StaffTransactions.objects.get(id=pk)
        serializer = StaffTransactionSerializer(staff_transaction,data=data,partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
    
    def delete(self,request,pk):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        staff_transaction = StaffTransactions.objects.get(id=pk)
        staff_transaction.delete()
        return Response("Deleted")
    
class StaffView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self,request,branchId=None):
        staffs = Staff.objects.filter(enterprise = request.user.person.enterprise)
        if branchId:
            staffs = staffs.filter(branch = branchId)
        serializer = StaffSerializer(staffs,many=True)
        return Response(serializer.data)
    
class CustomerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self,request,pk):
        customer = Customer.objects.filter(phone_number=pk).first()
        if customer:
            sales = SalesTransaction.objects.filter(phone_number=customer.phone_number,enterprise=request.user.person.enterprise)
            total_amount = 0
            for sale in sales:
                total_amount += sale.total_amount
            return Response({"name": customer.name, "phone_number": customer.phone_number, "total_spent": total_amount})
        else:
            return Response("Customer not found", status=status.HTTP_404_NOT_FOUND)

    def post(self,request):
        data = request.data
        enterprise = request.user.person.enterprise
        customer_name = data["customer_name"]
        phone_number = data["phone_number"]
        customer = Customer.objects.create(name=customer_name, phone_number=phone_number, enterprise=enterprise)
        if customer:
            total_spent = 0
            sales = SalesTransaction.objects.filter(phone_number=customer.phone_number, enterprise=enterprise)
            for sale in sales:
                total_spent += sale.total_amount
            return Response({"name": customer.name, "phone_number": customer.phone_number, "total_spent": total_spent})

class SalesReturnView(APIView):

    permission_classes = [IsAuthenticated]


    def get(self, request,branch=None):
        enterprise = request.user.person.enterprise
        search = request.GET.get('search')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        # Base QuerySet
        sales_returns = SalesReturn.objects.filter(enterprise=enterprise)

        if branch:
            sales_returns = sales_returns.filter(branch=branch)

        # -----------------
        # 1) Search Filter
        # -----------------
        if search:
            name_filter = sales_returns.filter(sales_transaction__name=search)
            # amount_filter = purchase_returns.filter(amount__icontains=search)
            product_name = sales_returns.filter(sales__product__name__icontains=search)
            
            # union() will merge the two QuerySets without duplicates.
            sales_returns = name_filter.union(product_name)
            if search.isdigit():
                id = sales_returns.filter(id__icontains=search)
                sales_returns = sales_returns.union(id)

        # ---------------------
        # 2) Date Range Filter
        # ---------------------
        # Only attempt date range filter if both start and end date are provided
        if start_date and end_date:
            start_datetime = parse_date(start_date)
            end_datetime = parse_date(end_date)
            if start_datetime and end_datetime:
                # Combine with min and max time to capture full day range

                sales_returns = sales_returns.filter(
                    date__range=(start_datetime, end_datetime)
                )

        # ---------------------------------
        # 3) Sort and Paginate the Results
        # ---------------------------------
        sales_returns = sales_returns.order_by('-id')  # Sorting

        paginator = PageNumberPagination()
        paginator.page_size = 5  # Set your desired page size
        paginated_data = paginator.paginate_queryset(sales_returns, request)

        serializer = SalesReturnSerializer(paginated_data, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    def post(self,request):
        data = request.data 
        user = request.user
        enterprise = user.person.enterprise
        data['enterprise'] = enterprise.id 
        if "date" in data:
            date_str = data["date"]
            # Assuming the format is 'YYYY-MM-DD'
            date_object = datetime.strptime(date_str, '%Y-%m-%d').date()
            data["date"] = date_object
        serializer = SalesReturnSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self,request,pk):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        purchase_return = SalesReturn.objects.filter(id=pk).first()
        serializer = SalesReturnSerializer()
        serializer.delete(purchase_return)
        return Response(status=status.HTTP_204_NO_CONTENT)
    

class DebtorsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branchId=None):
        enterprise = request.user.person.enterprise
        debtors = Debtor.objects.filter(enterprise=enterprise)
        
        if branchId:
            debtors = debtors.filter(branch=branchId)

        serializer = DebtorSerializer(debtors, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        data = request.data
        data['enterprise'] = request.user.person.enterprise.id
        serializer = DebtorSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        debtor = Debtor.objects.filter(id=pk).first()
        if not debtor:
            return Response("Debtor not found", status=status.HTTP_404_NOT_FOUND)
        debtor.delete()
        return Response("Deleted", status=status.HTTP_204_NO_CONTENT)
    
class DebtorTransactionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, debtor_pk=None, pk=None, branch=None):
        enterprise = request.user.person.enterprise
        debtor_transactions = DebtorTransaction.objects.filter(enterprise=enterprise)
        
        query = request.GET.get('search')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if branch:
            debtor_transactions = debtor_transactions.filter(branch=branch)

        if pk:
            debtor_transactions = DebtorTransaction.objects.filter(id=pk, enterprise=enterprise).first()
            serializer = DebtorTransactionSerializer(debtor_transactions)
            return Response(serializer.data)
        
        if debtor_pk:
            debtor_transactions = debtor_transactions.filter(debtor=debtor_pk)

        if query:
            debtor_transactions = debtor_transactions.filter(
                Q(debtor__name__icontains=query) | Q(debtor__branch__name__icontains=query)
            )

        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)

        if start_date and end_date:

            debtor_transactions = debtor_transactions.filter(
                date__range=(start_date, end_date)
            )

        debtor_transactions = debtor_transactions.order_by('-date','-id')


        paginator = PageNumberPagination()
        paginator.page_size = 5  # Set your desired page size
        paginated_data = paginator.paginate_queryset(debtor_transactions, request)

        serializer = DebtorTransactionSerializer(paginated_data, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    def post(self, request):
        data = request.data
        data['enterprise'] = request.user.person.enterprise.id
        serializer = DebtorTransactionSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, pk):
        data = request.data
        data['enterprise'] = request.user.person.enterprise.id
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        debtor_transaction = DebtorTransaction.objects.get(id=pk)
        serializer = DebtorTransactionSerializer(debtor_transaction, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)
    
    def delete(self, request, pk):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        debtor_transaction = DebtorTransaction.objects.filter(id=pk).first()
        if not debtor_transaction:
            return Response("Debtor Transaction not found", status=status.HTTP_404_NOT_FOUND)
        debtor_transaction.delete()
        return Response("Deleted", status=status.HTTP_204_NO_CONTENT)


class NCMTransactionView(APIView):
    """CRUD API for NCMTransaction objects.

    Behaves almost identically to :class:`DebtorTransactionView` but does not
    require a related debtor; instead transactions are linked to the singleton
    *NCM* record for the enterprise.  The frontend will use this for the
    "NCM Transactions" submenu.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, ncm_pk=None, pk=None, branch=None):
        enterprise = request.user.person.enterprise
        ncm_transactions = NCMTransaction.objects.filter(enterprise=enterprise, branch=branch)

        query = request.GET.get('search')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        if pk:
            ncm_transactions = NCMTransaction.objects.filter(id=pk, enterprise=enterprise).first()
            serializer = NCMTransactionSerializer(ncm_transactions)
            return Response(serializer.data)

        # optionally restrict to specific ncm record (should be only one)
        if ncm_pk:
            ncm_transactions = ncm_transactions.filter(ncm=ncm_pk)

        if query:
            # allow searching by description or branch name just like debtors
            ncm_transactions = ncm_transactions.filter(
                Q(desc__icontains=query) | Q(branch__name__icontains=query)
            )

        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)

        if start_date and end_date:
            ncm_transactions = ncm_transactions.filter(
                date__range=(start_date, end_date)
            )

        ncm_transactions = ncm_transactions.order_by('-date','-id')

        paginator = PageNumberPagination()
        paginator.page_size = 5
        paginated_data = paginator.paginate_queryset(ncm_transactions, request)

        serializer = NCMTransactionSerializer(paginated_data, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        data = request.data
        data['enterprise'] = request.user.person.enterprise.id
        serializer = NCMTransactionSerializer(data=data)
        data['ncm'] = NCM.objects.filter(enterprise=request.user.person.enterprise).first().id
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        data = request.data
        data['enterprise'] = request.user.person.enterprise.id
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        ncm_transaction = NCMTransaction.objects.filter(id=pk, enterprise=request.user.person.enterprise).first()
        if not ncm_transaction:
            return Response("NCM Transaction not found", status=status.HTTP_404_NOT_FOUND)
        if ncm_transaction.all_sales_transaction_id:
            return Response(
                {"detail": "NCM transactions linked to sales transactions cannot be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = NCMTransactionSerializer(ncm_transaction, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)

    def delete(self, request, pk):
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized")
        ncm_transaction = NCMTransaction.objects.filter(id=pk).first()
        ncm = ncm_transaction.ncm if ncm_transaction else None
        if ncm: 
            ncm.due -= ncm_transaction.amount
            ncm.save()
        if not ncm_transaction:
            return Response("NCM Transaction not found", status=status.HTTP_404_NOT_FOUND)
        ncm_transaction.delete()
        return Response("Deleted", status=status.HTTP_204_NO_CONTENT)
    

class VendorStatementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vendorId=None, branch=None):
        print("HERE START")
        enterprise = request.user.person.enterprise
        vendor = Vendor.objects.filter(id=vendorId, enterprise=enterprise).first()
        vendor_transactions = VendorTransactions.objects.filter(enterprise=enterprise,vendor=vendor)

        if not vendor:
            return Response("Vendor not found", status=status.HTTP_404_NOT_FOUND)

        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        if start_date:
            start_date = parse_date(start_date)
        
        if end_date:
            end_date = parse_date(end_date)

    
        if start_date and end_date:
            vendor_transactions = vendor_transactions.filter(
                date__range=(start_date, end_date)
            )
        elif start_date and not end_date:
            vendor_transactions = vendor_transactions.filter(
                date__gte=start_date
            )
        elif not start_date and end_date:
            vendor_transactions = vendor_transactions.filter(
                date__lte=end_date
            )

        vendor_transactions = vendor_transactions.order_by('date','id')
        vendor = VendorSerializer(vendor).data 
        # Calculate previous due when a start_date is provided
        previous_due = 0
        if start_date:
            print("HERE IN")
            prev_sum = VendorTransactions.objects.filter(
                enterprise=enterprise,
                vendor_id=vendorId,
                date__lt=start_date
            ).aggregate(total=Sum('amount'))['total'] or 0
            # Running formula is running -= amount, so opening due = -sum(amount before start)
            previous_due = -float(prev_sum)
            print("HERE", previous_due)
            vendor['previous_due'] = previous_due
            print("VENDOR", vendor)
        vts = VendorTransactionSerializer(vendor_transactions, many=True).data
        return Response({'vendor_data': vendor, 'vendor_transactions': vts})
    
class DebtorStatementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, debtorId=None, branch=None):
        enterprise = request.user.person.enterprise
        debtor = Debtor.objects.filter(id=debtorId, enterprise=enterprise).first()
        debtor_transactions = DebtorTransaction.objects.filter(enterprise=enterprise, debtor=debtor)

        if not debtor:
            return Response("Debtor not found", status=status.HTTP_404_NOT_FOUND)

        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)

    
        if start_date and end_date:
            debtor_transactions = debtor_transactions.filter(
                date__range=(start_date, end_date)
            )
        elif start_date and not end_date:
            debtor_transactions = debtor_transactions.filter(
                date__gte=start_date
            )
        elif not start_date and end_date:
            debtor_transactions = debtor_transactions.filter(
                date__lte=end_date
            )

        debtor_transactions = debtor_transactions.order_by('date','id')
        debtor = DebtorSerializer(debtor).data
        # Calculate previous due when a start_date is provided
        previous_due = 0
        if start_date:
            prev_sum = DebtorTransaction.objects.filter(
                enterprise=enterprise,
                debtor_id=debtorId,
                date__lt=start_date
            ).aggregate(total=Sum('amount'))['total'] or 0
            # Running formula is running -= amount, so opening due = -sum(amount before start)
            previous_due = -float(prev_sum)
            debtor['previous_due'] = previous_due
        dts = DebtorTransactionSerializer(debtor_transactions, many=True).data
        return Response({'debtor_data': debtor, 'debtor_transactions': dts})
    

class StaffStatementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, staffId=None, branch=None):
        enterprise = request.user.person.enterprise
        staff = Staff.objects.filter(id=staffId, enterprise=enterprise).first()
        staff_transactions = StaffTransactions.objects.filter(enterprise=enterprise, staff=staff)
        due = 0
        if not staff:
            return Response("Staff not found", status=status.HTTP_404_NOT_FOUND)

        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)

        if start_date and end_date:
            due = 0
            staff_transactions = staff_transactions.filter(
                date__range=(start_date, end_date)
            )
            for st in StaffTransactions.objects.filter(staff=staff, enterprise=enterprise, date__lt=start_date).order_by('date','id'):
                due += st.amount
        elif start_date and not end_date:
            staff_transactions = staff_transactions.filter(
                date__gte=start_date
            )
            due = 0
            for st in StaffTransactions.objects.filter(staff=staff, enterprise=enterprise, date__lt=start_date).order_by('date','id'):
                due += st.amount
        elif not start_date and end_date:
            staff_transactions = staff_transactions.filter(
                date__lte=end_date
            )

        staff_transactions = staff_transactions.order_by('date','id')
        staff_data = StaffSerializer(staff).data
        # previous_due for staff when start_date provided
        previous_due = 0
        if start_date:
            prev_sum = StaffTransactions.objects.filter(
                enterprise=enterprise,
                staff_id=staffId,
                date__lt=start_date
            ).aggregate(total=Sum('amount'))['total'] or 0
            previous_due = float(prev_sum)
            staff_data['previous_due'] = previous_due
        sts = StaffTransactionSerializer(staff_transactions, many=True).data
        return Response({'staff_data': staff_data, 'staff_transactions': sts})


class ProductTransferView(APIView):

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        # Handle product transfer logic here
        from_branch = request.data.get('from_branch')
        to_branch = request.data.get('to_branch')
        # date = request.data.get('date')
        date = timezone.now().date()  # Use current date for transfer
        products = request.data.get('products')
        print("This is products: ", products)

        # branch = request.user.person.branch
        # if branch != from_branch:
            # return Response("Unauthorized branch for transfer", status=status.HTTP_403_FORBIDDEN)
        enterprise = request.user.person.enterprise.id

        sales = []
        purchase = []
        for product in products:
            product_barcode = product.get('product')
            if product_barcode:
                # Perform the transfer logic for each product
                sales.append({
                    'product': Product.objects.get(uid=product_barcode, branch=from_branch).id,
                    'quantity': product.get('quantity', 0),
                    'unit_price': product.get('unit_price', 0),
                })

                purchase.append({
                    'product': Product.objects.get(uid=product_barcode, branch=to_branch).id,
                    'quantity': product.get('quantity', 0),
                    'unit_price': product.get('unit_price', 0),
                })

        print("This is sales: ", sales)
        print("###########################\nThis is purchases: ", purchase)


        sales_data = {
            'enterprise': enterprise,
            'branch': from_branch,
            'date': date,
            'sales': sales,
            'bill_no': '000',
            'method': 'transfer',
            'person': request.user.person
        }

        purchase_data = {
            'enterprise': enterprise,
            'branch': to_branch,
            'date': date,
            'purchase': purchase,
            'bill_no': '000',
            'method': 'transfer',
            'person': request.user.person
        }
        # sale_transaction = SalesTransactionSerializer().create({
        #     'enterprise': enterprise,
        #     'branch': from_branch,
        #     'date': date,
        #     'sales': sales,
        #     'bill_no': 'transfer',
        #     'method': 'transfer',
        # })

        # purchase_transaction = PurchaseTransactionSerializer().create({
        #     'enterprise': enterprise,
        #     'branch': to_branch,
        #     'date': date,
        #     'purchase': purchase,
        #     'bill_no': 'transfer',
        #     'method': 'transfer',
        # })

        sales_transaction_serializer = SalesTransactionSerializer(data=sales_data)
        purchase_transaction_serializer = PurchaseTransactionSerializer(data=purchase_data)

        if sales_transaction_serializer.is_valid(raise_exception=True) and purchase_transaction_serializer.is_valid(raise_exception=True):
            sales_transaction_serializer.save()
            purchase_transaction_serializer.save()
            return Response(f"Product transferred successfully from {from_branch} to {to_branch}", status=status.HTTP_200_OK)

        return Response(f"Failed to transfer product from {from_branch} to {to_branch}", status=status.HTTP_400_BAD_REQUEST)

class ExpensesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None, pk=None):
        enterprise = request.user.person.enterprise
        # Single expense fetch
        if pk is not None:
            expense = Expenses.objects.filter(id=pk, enterprise=enterprise).first()
            if not expense:
                return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
            serializer = ExpensesSerializer(expense)
            return Response(serializer.data)
        
        # Fetch both expenses and withdrawals
        expenses = Expenses.objects.filter(enterprise=enterprise)
        withdrawals = Withdrawal.objects.filter(enterprise=enterprise)

        if branch:
            expenses = expenses.filter(branch=branch)
            withdrawals = withdrawals.filter(branch=branch)

        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        search = request.GET.get('search')

        if search:
            expenses = expenses.filter(Q(desc__icontains=search) | Q(method__icontains=search))
            if search.isdigit():
                withdrawals = withdrawals.filter(amount=float(search))
            else:
                # If search is not numeric, exclude all withdrawals from results
                withdrawals = withdrawals.none()

        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)

    
        if start_date and end_date:
            expenses = expenses.filter(date__range=(start_date, end_date))
            withdrawals = withdrawals.filter(date__range=(start_date, end_date))
        elif start_date and not end_date:
            expenses = expenses.filter(date__gte=start_date)
            withdrawals = withdrawals.filter(date__gte=start_date)
        elif not start_date and end_date:
            expenses = expenses.filter(date__lte=end_date)
            withdrawals = withdrawals.filter(date__lte=end_date)

        # Combine expenses and withdrawals into a single list
        expenses_data = []
        for exp in expenses:
            expenses_data.append({
                'id': exp.id,
                'date': exp.date,
                'amount': exp.amount,
                'method': exp.method,
                'desc': exp.desc,
                'person_name': exp.person.user.name if exp.person else None,
                'type': 'Expense'
            })
        
        for wit in withdrawals:
            expenses_data.append({
                'id': wit.id,
                'date': wit.date,
                'amount': wit.amount,
                'method': 'N/A',  # Withdrawals don't have method
                'desc': 'Withdrawal',
                'person_name': wit.person.user.name if wit.person else None,
                'type': 'Withdrawal'
            })
        
        # Sort combined list by date (descending) and id
        expenses_data.sort(key=lambda x: (x['date'], x['id']), reverse=True)

        # Paginate combined results
        paginator = PageNumberPagination()
        paginator.page_size = 5
        # Manual pagination for combined list
        page_number = request.GET.get('page', 1)
        try:
            page_number = int(page_number)
        except ValueError:
            page_number = 1
        
        start_idx = (page_number - 1) * paginator.page_size
        end_idx = start_idx + paginator.page_size
        page_data = expenses_data[start_idx:end_idx]
        
        total_count = len(expenses_data)
        total_pages = (total_count + paginator.page_size - 1) // paginator.page_size
        
        return Response({
            'count': total_count,
            'next': f"?page={page_number + 1}" if page_number < total_pages else None,
            'previous': f"?page={page_number - 1}" if page_number > 1 else None,
            'results': page_data,
            'total_pages': total_pages,
            'page': page_number
        })
    

    def post(self,request):

        data = request.data 
        user = request.user
        enterprise = user.person.enterprise
        data['enterprise'] = enterprise.id 
        # Record who created the expense for consistency with other flows
        data['person'] = getattr(user, 'person', None)
        serializer = ExpensesSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self,request,pk):
        data = request.data 
        user = request.user
        enterprise = user.person.enterprise
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized", status=status.HTTP_403_FORBIDDEN)
        expense = Expenses.objects.get(id=pk, enterprise=enterprise)
        serializer = ExpensesSerializer(expense,data=data,partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors)

    
    def delete(self,request,pk):
        role = request.user.person.role
        enterprise = request.user.person.enterprise
        if role != "Admin":
            return Response("Unauthorized", status=status.HTTP_403_FORBIDDEN)
        expense = Expenses.objects.get(id=pk, enterprise=enterprise)
        expense.delete()
        return Response("Deleted", status=status.HTTP_204_NO_CONTENT)
        

class ExpensesReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None):
        """Return expense rows plus a summary object (last element)."""
        enterprise = request.user.person.enterprise
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        search = request.GET.get('search')

        expenses = Expenses.objects.filter(enterprise=enterprise)
        if branch:
            expenses = expenses.filter(branch=branch)

        # Apply search filter
        if search:
            expenses = expenses.filter(Q(desc__icontains=search) | Q(method__icontains=search))

        # Apply date filters
        if start_date and end_date:
            sd = parse_date(start_date)
            ed = parse_date(end_date)
            if sd and ed:
                expenses = expenses.filter(date__range=(sd, ed))
        elif start_date and not end_date:
            sd = parse_date(start_date)
            if sd:
                expenses = expenses.filter(date__gte=sd)
        elif end_date and not start_date:
            ed = parse_date(end_date)
            if ed:
                expenses = expenses.filter(date__lte=ed)

        # Default to today's expenses when no filters/search provided
        if not search and not start_date and not end_date:
            expenses = expenses.filter(date=timezone.now().date())

        expenses = expenses.order_by('date', 'id')

        count = expenses.count()
        total_expenses = 0
        cash_expenses = 0
        cheque_expenses = 0
        transfer_expenses = 0

        rows = []
        for exp in expenses:
            amt = exp.amount or 0
            total_expenses += amt
            if exp.method == 'cash':
                cash_expenses += amt
            elif exp.method == 'cheque':
                cheque_expenses += amt
            elif exp.method == 'transfer':
                transfer_expenses += amt

            rows.append({
                'id': exp.id,
                'date': exp.date,
                'method': exp.method,
                'amount': amt,
                'desc': exp.desc,
                'person_name': exp.person.user.name if exp.person else None,
            })

        rows.append({
            'count': count,
            'total_expenses': total_expenses,
            'cash_expenses': cash_expenses,
            'cheque_expenses': cheque_expenses,
            'transfer_expenses': transfer_expenses,
        })

        return Response(rows)


class WithdrawalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None, pk=None):
        enterprise = request.user.person.enterprise
        if pk is not None:
            withdrawal = Withdrawal.objects.filter(id=pk, enterprise=enterprise).first()
            if not withdrawal:
                return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
            return Response(WithdrawalSerializer(withdrawal).data)

        withdrawals = Withdrawal.objects.filter(enterprise=enterprise)
        if branch:
            withdrawals = withdrawals.filter(branch=branch)

        # Filters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        search = request.GET.get('search')  # amount search

        if search:
            if search.isdigit():
                withdrawals = withdrawals.filter(amount=float(search))

        if start_date and end_date:
            sd = parse_date(start_date)
            ed = parse_date(end_date)
            if sd and ed:
                withdrawals = withdrawals.filter(date__range=(sd, ed))
        elif start_date and not end_date:
            sd = parse_date(start_date)
            if sd:
                withdrawals = withdrawals.filter(date__gte=sd)
        elif end_date and not start_date:
            ed = parse_date(end_date)
            if ed:
                withdrawals = withdrawals.filter(date__lte=ed)

        withdrawals = withdrawals.order_by('-date', '-id')

        paginator = PageNumberPagination()
        paginator.page_size = 5
        page = paginator.paginate_queryset(withdrawals, request)
        serializer = WithdrawalSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        data = request.data.copy()
        user = request.user
        enterprise = user.person.enterprise
        data['enterprise'] = enterprise.id
        data['person'] = getattr(user, 'person', None)
        serializer = WithdrawalSerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        enterprise = request.user.person.enterprise
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized", status=status.HTTP_403_FORBIDDEN)
        withdrawal = Withdrawal.objects.filter(id=pk, enterprise=enterprise).first()
        if not withdrawal:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = WithdrawalSerializer(withdrawal, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        enterprise = request.user.person.enterprise
        role = request.user.person.role
        if role != "Admin":
            return Response("Unauthorized", status=status.HTTP_403_FORBIDDEN)
        withdrawal = Withdrawal.objects.filter(id=pk, enterprise=enterprise).first()
        if not withdrawal:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        withdrawal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class WithdrawalReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None):
        enterprise = request.user.person.enterprise
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        search = request.GET.get('search')

        withdrawals = Withdrawal.objects.filter(enterprise=enterprise)
        if branch:
            withdrawals = withdrawals.filter(branch=branch)

        if search and search.isdigit():
            withdrawals = withdrawals.filter(amount=float(search))

        if start_date and end_date:
            sd = parse_date(start_date); ed = parse_date(end_date)
            if sd and ed:
                withdrawals = withdrawals.filter(date__range=(sd, ed))
        elif start_date and not end_date:
            sd = parse_date(start_date); withdrawals = withdrawals.filter(date__gte=sd) if sd else withdrawals
        elif end_date and not start_date:
            ed = parse_date(end_date); withdrawals = withdrawals.filter(date__lte=ed) if ed else withdrawals

        if not search and not start_date and not end_date:
            withdrawals = withdrawals.filter(date=timezone.now().date())

        withdrawals = withdrawals.order_by('date', 'id')

        total = 0
        count = withdrawals.count()
        rows = []
        for w in withdrawals:
            amt = w.amount or 0
            total += amt
            rows.append({
                'id': w.id,
                'date': w.date,
                'amount': amt,
                'person_name': w.person.user.name if w.person else None,
            })
        rows.append({
            'count': count,
            'total_withdrawals': total,
        })
        return Response(rows)


class IncomeExpenseReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None):
        enterprise = request.user.person.enterprise
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        total_cash_income = 0
        total_online_income = 0
        total_card_income = 0
        total_cash_expense = 0
        total_online_expense = 0
        total_card_expense = 0
        total_income = 0
        total_expense = 0
        total_withdrawal = 0
        if start_date:
            report_start_date = parse_date(start_date)
        else:
            report_start_date = timezone.now().date()

        if end_date:
            report_end_date = parse_date(end_date)
        else:
            report_end_date = timezone.now().date()
        # Sales
        message = None
        closing_cash = ClosingCash.objects.filter(enterprise=enterprise, branch=branch,date=report_start_date - timedelta(days=1))
        closing_cash = closing_cash.order_by('-date', '-id')  # Get the latest closing cash before the report start date
        if closing_cash.exists() == False:
            closing_cash = ClosingCash.objects.filter(enterprise=enterprise,branch=branch, date__lte=report_start_date).order_by('-date').first()
            if closing_cash:
                required_date = closing_cash.date + timedelta(days=1)
                message= f"Your closing cash for the previous date was not set. Now using the last closing cash of {closing_cash.date} to generate the report. The generated report will start from {required_date}."
                report_start_date = required_date
        else:
            closing_cash = closing_cash.first()
        sales = SalesTransaction.objects.filter(enterprise=enterprise,branch=branch, date__range=(report_start_date, report_end_date))
        sales = sales.exclude(method='transfer')
        if branch:
            sales = sales.filter(branch=branch)
        list1=[]
        for sale in sales:
            desc = ""
            if sale.is_sale_exchange:
                desc += "Sale Exchange for balance amounting to " + str(sale.exchange_previous_balance) + ". \nTotal: " + str(sale.total_amount) + ". \t Prev: " + str(sale.exchange_previous_balance) + ". \t Exceeding: " + str(sale.exchange_exceeded_amount) + ". \nProducts: "
            for s in sale.sales.all():
                desc += f"{s.product.name} (x{s.quantity}), \n "
            sale.description = desc.rstrip(", ")
            list1.append({
                'id': sale.id,
                'bill_no': sale.bill_no,
                'net_amount': sale.amount_paid,
                'description': sale.description,
                'method': sale.method,
                'cash_amount': sale.cash_amount,
                'card_amount': sale.card_amount,
                'online_amount': sale.online_amount,
                'type': 'Sale',
                'date': sale.date
            })
            total_cash_income += sale.cash_amount or 0
            total_card_income += sale.card_amount or 0
            total_online_income += sale.online_amount or 0
            total_income += sale.amount_paid or 0

        orders = Order.objects.filter(enterprise=enterprise, received_date__range=(report_start_date, report_end_date))
        if branch:
            orders = orders.filter(branch=branch)
        for order in orders:
            desc = "Order's Advanced Payment for: "
            for o in order.items.all():
                desc += f"{o.item}), \n "
            order.description = desc.rstrip(", ")
            list1.append({
                'id': order.id,
                'bill_no': order.bill_no,
                'net_amount': order.advance_received,
                'description': order.description,
                'method': order.advance_method,
                'type': 'Order',
                'date': order.received_date
            })
            if order.advance_method == 'cash':
                total_cash_income += order.advance_received or 0
            elif order.advance_method == 'card':
                total_card_income += order.advance_received or 0
            elif order.advance_method == 'online':
                total_online_income += order.advance_received or 0
            elif order.advance_method == 'mixed':
                total_cash_income += order.cash_advance or 0
                total_card_income += order.card_advance or 0
                total_online_income += order.online_advance or 0
            total_income += order.advance_received or 0

        remaining_payment_orders = Order.objects.filter(enterprise=enterprise, remaining_received_date__range=(report_start_date, report_end_date))
        if branch:
            remaining_payment_orders = remaining_payment_orders.filter(branch=branch)

        for order in remaining_payment_orders:
            desc = "Order's Remaining Payment for: "
            for o in order.items.all():
                desc += f"{o.item}), \n "
            order.description = desc.rstrip(", ")
            list1.append({
                'id': order.id,
                'bill_no': order.bill_no,
                'net_amount': order.remaining_received,
                'description': order.description,
                'method': order.remaining_received_method,
                'type': 'Order',
                'date': order.remaining_received_date
            })
            if order.remaining_received_method == 'cash':
                total_cash_income += order.remaining_received or 0
            elif order.remaining_received_method == 'card':
                total_card_income += order.remaining_received or 0
            elif order.remaining_received_method == 'online':
                total_online_income += order.remaining_received or 0
            elif order.remaining_received_method == 'mixed':
                total_cash_income += order.cash_remaining or 0
                total_card_income += order.card_remaining or 0
                total_online_income += order.online_remaining or 0
            total_income += order.remaining_received or 0

        dts = DebtorTransaction.objects.filter(enterprise=enterprise, date__range=(report_start_date, report_end_date))
        if branch:
            dts = dts.filter(branch=branch)

        for dt in dts:
            if dt.method == 'credit':
                continue
            list1.append({
                'id': dt.id,
                'bill_no': 'Debtor Transaction',
                'net_amount': dt.amount,
                'description': f"Debtor Transaction for {dt.debtor.name}: {dt.desc}",
                'method': dt.method,
                'date': dt.date,
                'type': 'Debtor Transaction',
            })
            if dt.method == 'cash':
                if dt.amount > 0:
                    total_cash_income += dt.amount or 0
                else:
                    total_cash_expense += -dt.amount or 0
            elif dt.method == 'card':
                if dt.amount > 0:
                    total_card_income += dt.amount or 0
                else:
                    total_card_expense += -dt.amount or 0
            elif dt.method == 'online':
                if dt.amount > 0:
                    total_online_income += dt.amount or 0
                else:
                    total_online_expense += -dt.amount or 0
            if dt.amount > 0:
                total_income += dt.amount or 0
            else:
                total_expense += -dt.amount or 0

        expenses = Expenses.objects.filter(enterprise=enterprise, date__range=(report_start_date, report_end_date))
        if branch:
            expenses = expenses.filter(branch=branch)
        for exp in expenses:
            list1.append({
                'id': exp.id,
                'bill_no': 'Expense',
                'net_amount': -exp.amount,
                'description': f"{exp.desc}",
                'method': exp.method,
                'type': 'Expense',
                'date': exp.date
            })
            if exp.method == 'cash':
                total_cash_expense += exp.amount or 0
            elif exp.method == 'card':
                total_card_expense += exp.amount or 0
            elif exp.method == 'online':
                total_online_expense += exp.amount or 0
            total_expense += exp.amount or 0

        withdrawals = Withdrawal.objects.filter(enterprise=enterprise, date__range=(report_start_date, report_end_date))
        if branch:
            withdrawals = withdrawals.filter(branch=branch)
        for wd in withdrawals:
            list1.append({
                'id': wd.id,
                'bill_no': 'Withdrawal',
                'net_amount': -wd.amount,
                'description': f"Withdrawal by {wd.person.user.name if wd.person else 'Unknown'}",
                'method': 'N/A',
                'type': 'Withdrawal',
                'date': wd.date
            })
            total_withdrawal += wd.amount or 0
        
        sort_order = {
            "cash" : 1,
            "card" : 2,
            "online" : 3,
            "mixed" : 4,
            "credit" : 5,
            "N/A" : 6,
        }
        net_cash_in_hand = (closing_cash.amount if closing_cash else 0) + total_cash_income - total_cash_expense - total_withdrawal
        list1.sort(key=lambda x: (
            x["date"],              # 1st: date (ascending)
            sort_order[x["method"]]        # 2nd: type priority
        ))

        report = {
            'transactions' : list1,
            'total_cash_income': total_cash_income,
            'total_cash_expense': total_cash_expense,
            'total_online_income': total_online_income,
            'total_online_expense': total_online_expense,
            'total_card_income': total_card_income,
            'total_card_expense': total_card_expense,
            'previous_closing_cash': closing_cash.amount if closing_cash else 0,
            'net_cash_in_hand': net_cash_in_hand,
            'total_income': total_income,
            'total_expense': total_expense,
            'total_withdrawal': total_withdrawal,
        }
        if message:
            report['message'] = message
        return Response(report)


class ClosingCashView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Create or update today's closing cash for a branch.

        Request body expects: { "branch": <branch_id>, "amount": <float> }
        Enterprise is inferred from the authenticated user. Date auto-populates.
        If a ClosingCash already exists for today for the branch+enterprise it will be updated.
        Returns the serialized ClosingCash object.
        """
        enterprise = request.user.person.enterprise
        branch_id = request.data.get('branch')
        amount = request.data.get('amount')
        if branch_id is None or amount is None:
            return Response({"detail": "branch and amount are required"}, status=status.HTTP_400_BAD_REQUEST)
        branch_obj = Branch.objects.filter(id=branch_id, enterprise=enterprise).first()
        if not branch_obj:
            return Response({"detail": "Branch not found"}, status=status.HTTP_404_NOT_FOUND)
        today = timezone.now().date()
        closing_cash = ClosingCash.objects.filter(enterprise=enterprise, branch=branch_obj, date=today).first()
        if closing_cash:
            closing_cash.amount = amount
            closing_cash.save()
            serializer = ClosingCashSerializer(closing_cash)
            return Response(serializer.data, status=status.HTTP_200_OK)
        # Do not pass date; model auto_populates via auto_now_add.
        serializer = ClosingCashSerializer(data={
            'enterprise': enterprise.id,
            'branch': branch_obj.id,
            'amount': amount,
            'date': today,  # explicitly provide date as requested
        })
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        """Optional helper: fetch today's closing cash for a branch (branch query param)."""
        enterprise = request.user.person.enterprise
        branch_id = request.GET.get('branch')
        today = timezone.now().date()
        qs = ClosingCash.objects.filter(enterprise=enterprise, date=today)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        serializer = ClosingCashSerializer(qs, many=True)
        return Response(serializer.data)


class NCMReport(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, branch=None):
        """Return a statement for the enterprise's NCM account.

        The logic is essentially a copy of :class:`DebtorStatementView` but
        operates on the ``NCM`` / ``NCMTransaction`` models.  We allow an
        optional ``branch`` path parameter so the frontend can view statements
        branch‑wise (the user asked for a branch column on the page).
        """

        enterprise = request.user.person.enterprise
        ncm = NCM.objects.filter(enterprise=enterprise, branch=branch).first()
        # if there is no NCM record for the enterprise we cannot proceed
        if not ncm:
            return Response("NCM not found", status=status.HTTP_404_NOT_FOUND)

        # transactions should be filtered by the base NCM object (there should
        # only be one per enterprise) but also optionally by branch
        ncm_transactions = NCMTransaction.objects.filter(enterprise=enterprise, ncm=ncm)
        print("Initial NCM transactions count: ", ncm_transactions.count())
        # if branch:
        #     ncm_transactions = ncm_transactions.filter(branch=branch)

        if not ncm:
            return Response("NCM not found", status=status.HTTP_404_NOT_FOUND)

        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        if start_date and end_date:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)

    
        if start_date and end_date:
            ncm_transactions = ncm_transactions.filter(
                date__range=(start_date, end_date)
            )
        elif start_date and not end_date:
            ncm_transactions = ncm_transactions.filter(
                date__gte=start_date
            )
        elif not start_date and end_date:
            ncm_transactions = ncm_transactions.filter(
                date__lte=end_date
            )

        ncm_transactions = ncm_transactions.order_by('date','id')
        ncm_data = NCMSerializer(ncm).data
        # include human readable branch name for frontend convenience
        branch_name = None
        if branch:
            try:
                branch_obj = Branch.objects.get(id=branch)
                branch_name = branch_obj.name
            except Branch.DoesNotExist:
                branch_name = None
        else:
            # if the NCM object itself has a branch set use that
            branch_name = ncm.branch.name if ncm.branch else None
        if branch_name:
            ncm_data['branch_name'] = branch_name
        # Calculate previous due when a start_date is provided
        previous_due = 0
        if start_date:
            prev_sum = NCMTransaction.objects.filter(
                enterprise=enterprise,
                ncm=ncm,
                date__lt=start_date
            ).aggregate(total=Sum('amount'))['total'] or 0
            # running business logic: due decreases by amount so opening due
            # is negative of the sum of prior amounts
            previous_due = -float(prev_sum)
            ncm_data['previous_due'] = previous_due
        ncmts = NCMTransactionSerializer(ncm_transactions, many=True).data
        return Response({'ncm_data': ncm_data, 'ncm_transactions': ncmts})
    
