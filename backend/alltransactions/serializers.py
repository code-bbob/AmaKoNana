from rest_framework import serializers
from .models import Vendor, Purchase, PurchaseTransaction,PurchaseReturn, Sales, SalesTransaction, VendorTransactions, SalesReturn
from django.db import transaction
from allinventory.models import Product,Brand
from alltransactions.models import Staff,StaffTransactions, Debtor, DebtorTransaction



class VendorSerializer(serializers.ModelSerializer):
    # brand_name = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Vendor
        fields = '__all__'


    
class PurchaseSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    product_name = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Purchase
        fields = ['id','product_name', 'product', 'quantity', 'unit_price', 'total_price','returned','returned_quantity']
        read_only_fields = ['returned','total_price']

    def get_product_name(self, obj):
        return obj.product.name

class PurchaseTransactionSerializer(serializers.ModelSerializer):
    purchase = PurchaseSerializer(many=True)
    vendor_name = serializers.SerializerMethodField(read_only=True)
    date = serializers.DateField()

    class Meta:
        model = PurchaseTransaction
        fields = '__all__'

    def _get_locked_product(self, product_id, cache):
        """
        Fetch a Product with select_for_update, caching to avoid redundant queries.
        """
        if product_id not in cache:
            cache[product_id] = Product.objects.select_for_update().get(id=product_id)
        return cache[product_id]

    @transaction.atomic
    def create(self, validated_data):
        purchases = validated_data.pop('purchase')
        purchase_transaction = PurchaseTransaction.objects.create(**validated_data)
        products_cache = {}
        brands_cache = {}
        desc = f'Purchase made for :\n'

        # Create each Purchase and update Product/Brand counts/stocks
        for purchase in purchases:
            desc += f"{purchase.get('product', {})} - {purchase.get('quantity', 0)} pcs, \n"
            if not purchase.get('total_price'):
                purchase['total_price'] = purchase['quantity'] * purchase['unit_price']
            purchaseobj = Purchase.objects.create(purchase_transaction=purchase_transaction, **purchase)

            # lock and cache product
            product = self._get_locked_product(purchaseobj.product.id, products_cache)
            product.count = (product.count + purchaseobj.quantity) if product.count is not None else purchaseobj.quantity
            product.stock = (product.stock + purchaseobj.quantity * product.selling_price) if product.stock is not None else purchaseobj.quantity * product.selling_price

            # lock and cache brand
            brand_obj = product.brand
            if brand_obj.id not in brands_cache:
                brands_cache[brand_obj.id] = brand_obj
            brand = brands_cache[brand_obj.id]
            brand.count = (brand.count + purchaseobj.quantity) if brand.count is not None else purchaseobj.quantity
            brand.stock = (brand.stock + purchaseobj.quantity * product.selling_price) if brand.stock is not None else purchaseobj.quantity * product.selling_price

            product.save()
            brand.save()

        # Calculate total amount and record base transaction
        amount = purchase_transaction.calculate_total_amount()
        vendor = purchase_transaction.vendor

        VendorTransactionSerializer().create({
            'vendor': vendor,
            'date': purchase_transaction.date,
            'amount': -amount,
            'desc': desc,
            'method': purchase_transaction.method,
            'purchase_transaction': purchase_transaction,
            'enterprise': purchase_transaction.enterprise,
            'branch': purchase_transaction.branch,
            'type': 'base',
            'bill_no': purchase_transaction.bill_no
        })

        # Handle payment method -> create VendorTransactions if needed
        method = purchase_transaction.method
        if method == 'cash':
            VendorTransactionSerializer().create({
                'vendor': vendor,
                'branch': purchase_transaction.branch,
                'date': purchase_transaction.date,
                'amount': purchase_transaction.total_amount,
                'desc': 'Paid for purchase',
                'method': 'cash',
                'purchase_transaction': purchase_transaction,
                'enterprise': purchase_transaction.enterprise,
                'type': 'payment',
                'bill_no': purchase_transaction.bill_no
            })
        elif method == 'cheque':
            VendorTransactionSerializer().create({
                'vendor': vendor,
                'branch': purchase_transaction.branch,
                'date': purchase_transaction.date,
                'amount': purchase_transaction.total_amount,
                'desc': 'Paid for purchase',
                'method': 'cheque',
                'cheque_number': purchase_transaction.cheque_number,
                'cashout_date': purchase_transaction.cashout_date,
                'purchase_transaction': purchase_transaction,
                'enterprise': purchase_transaction.enterprise,
                'type': 'payment',
                'bill_no': purchase_transaction.bill_no
            })

        return purchase_transaction

    @transaction.atomic
    def update(self, instance, validated_data):
        # Store old values
        old_vendor = instance.vendor
        old_method = instance.method
        old_total = instance.total_amount or 0
        old_date = instance.date

        # Update transaction fields
        instance.vendor = validated_data.get('vendor', instance.vendor)
        instance.date = validated_data.get('date', instance.date)
        instance.method = validated_data.get('method', instance.method)
        instance.cheque_number = validated_data.get('cheque_number', instance.cheque_number)
        instance.cashout_date = validated_data.get('cashout_date', instance.cashout_date)
        instance.save()

        products_cache = {}
        brands_cache = {}
        desc = f'Purchase made for :\n'

        def get_product_obj(product):
            return self._get_locked_product(product.id, products_cache)

        purchases_data = validated_data.pop('purchase', [])

        # Keep track of existing purchases
        existing_purchases = {purchase.id: purchase for purchase in instance.purchase.all()}
        new_purchase_ids = []

        for purchase_data in purchases_data:
            desc += f"{purchase_data.get('product', {})} - {purchase_data.get('quantity', 0)} pcs, \n"
            purchase_id = purchase_data.get('id', None)
            if purchase_id and purchase_id in existing_purchases:
                # Update existing purchase
                purchase_instance = existing_purchases[purchase_id]

                # Lock old
                old_product = get_product_obj(purchase_instance.product)
                old_quantity = purchase_instance.quantity

                # New product lock
                new_product = purchase_data.get('product', old_product)
                new_product = get_product_obj(new_product)
                new_quantity = purchase_data.get('quantity', old_quantity)

                # Adjust stock for old/new product if changed
                if old_product != new_product:
                    # Decrease from old
                    old_product.count -= old_quantity
                    old_product.stock -= old_quantity * old_product.selling_price
                    old_product.save()
                    # Brand old
                    old_brand = old_product.brand
                    if old_brand.id not in brands_cache:
                        brands_cache[old_brand.id] = old_brand
                    old_brand = brands_cache[old_brand.id]
                    old_brand.count -= old_quantity
                    old_brand.stock -= old_quantity * old_product.selling_price
                    old_brand.save()

                    # Increase in new
                    new_product.count = (new_product.count or 0) + new_quantity
                    new_product.stock = (new_product.stock or 0) + new_quantity * new_product.selling_price
                    new_product.save()
                    new_brand = new_product.brand
                    if new_brand.id not in brands_cache:
                        brands_cache[new_brand.id] = new_brand
                    new_brand = brands_cache[new_brand.id]
                    new_brand.count += new_quantity
                    new_brand.stock += new_quantity * new_product.selling_price
                    new_brand.save()
                else:
                    # Same product -> adjust quantity
                    quantity_diff = new_quantity - old_quantity
                    stock_diff = quantity_diff * old_product.selling_price

                    old_product.count = (old_product.count or 0) + quantity_diff
                    old_product.stock = (old_product.stock or 0) + stock_diff
                    old_product.save()

                    old_brand = old_product.brand
                    if old_brand.id not in brands_cache:
                        brands_cache[old_brand.id] = old_brand
                    old_brand = brands_cache[old_brand.id]
                    old_brand.count += quantity_diff
                    old_brand.stock += stock_diff
                    old_brand.save()

                for attr, value in purchase_data.items():
                    if attr == 'returned':
                        print("Handling returned attribute pid:", attr)
                        continue
                    print("YAHA aaunu hunna ,", attr)
                    setattr(purchase_instance, attr, value)
                print(f"--- Finished purchase data processing. purchase_instance.returned is now: {purchase_instance.returned} ---")
                if not purchase_data.get('total_price'):
                    purchase_instance.total_price = purchase_instance.quantity * purchase_instance.unit_price
                purchase_instance.save()
                new_purchase_ids.append(purchase_instance.id)
                del existing_purchases[purchase_id]
            else:
                # Create new purchase
                purchase_data['purchase_transaction'] = instance
                if not purchase_data.get('total_price'):
                    purchase_data['total_price'] = purchase_data['quantity'] * purchase_data['unit_price']
                new_purchase = Purchase.objects.create(**purchase_data)

                # Lock and update new product
                new_product = self._get_locked_product(new_purchase.product.id, products_cache)
                new_product.count = (new_product.count or 0) + new_purchase.quantity
                new_product.stock = (new_product.stock or 0) + new_purchase.quantity * new_product.selling_price
                new_product.save()

                new_brand = new_product.brand
                if new_brand.id not in brands_cache:
                    brands_cache[new_brand.id] = new_brand
                new_brand = brands_cache[new_brand.id]
                new_brand.count += new_purchase.quantity
                new_brand.stock += new_purchase.quantity * new_product.selling_price
                new_brand.save()

                new_purchase_ids.append(new_purchase.id)

        # Remove deleted purchases
        for removed in existing_purchases.values():
            old_product = self._get_locked_product(removed.product.id, products_cache)
            old_quantity = removed.quantity
            old_product.count -= old_quantity
            old_product.stock -= old_quantity * old_product.selling_price
            old_product.save()

            old_brand = old_product.brand
            if old_brand.id not in brands_cache:
                brands_cache[old_brand.id] = old_brand
            old_brand = brands_cache[old_brand.id]
            old_brand.count -= old_quantity
            old_brand.stock -= old_quantity * old_product.selling_price
            old_brand.save()

            removed.delete()

        # Recalculate total and handle vendor transactions
        instance.calculate_total_amount()
        instance.refresh_from_db()
        new_total_amount = instance.total_amount
        instance.save()

        # Refresh and adjust vendor txns as before...
        new_vendor = instance.vendor
        amount_diff = new_total_amount - old_total

        if old_date != instance.date:
            vts = VendorTransactions.objects.filter(purchase_transaction=instance)
            for vt in vts:
                vt.date = instance.date
                vt.save()

        # Handle full vendor transaction rebuild if method/vendor/total changed
        if old_method != instance.method or old_total != new_total_amount or old_vendor != instance.vendor:
            vts_all = VendorTransactions.objects.filter(purchase_transaction=instance)
            for vt in vts_all:
                vt.delete()
            instance.vendor.refresh_from_db()
            base = {
                'vendor': instance.vendor,
                'date': instance.date,
                'branch': instance.branch,
                'enterprise': instance.enterprise,
                'amount': -new_total_amount,
                'desc': desc,
                'method': instance.method,
                'purchase_transaction': instance,
                'type': 'base',
                'bill_no': instance.bill_no,
            }
            VendorTransactionSerializer().create(base)
            if instance.method in ('cash', 'cheque'):
                pay = base.copy()
                pay['amount'] = new_total_amount
                pay['desc'] = 'Paid for purchase'
                pay['type'] = 'payment'
                pay['branch'] = instance.branch
                pay['enterprise'] = instance.enterprise
                if instance.method == 'cheque':
                    pay.update({'cheque_number': instance.cheque_number, 'cashout_date': instance.cashout_date})
                VendorTransactionSerializer().create(pay)

        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['date'] = instance.date.strftime('%Y-%m-%d')
        return representation

    def get_vendor_name(self, obj):
        return obj.vendor.name


class SalesSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    product_name = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Sales
        fields = ['id', 'product', 'quantity', 'unit_price', 'total_price','product_name','returned','returned_quantity']
        read_only_fields = ['total_price', 'returned']

    def get_product_name(self, obj):
        return obj.product.name

class SalesTransactionSerializer(serializers.ModelSerializer):  
    sales = SalesSerializer(many=True)
    date = serializers.DateField()

    class Meta:
        model = SalesTransaction
        fields = '__all__'

    def _get_locked_product(self, product_id, cache):
        """
        Fetch a Product with select_for_update, caching to avoid redundant queries.
        """
        if product_id not in cache:
            cache[product_id] = Product.objects.select_for_update().get(id=product_id)
        return cache[product_id]

    @transaction.atomic
    def create(self, validated_data):
        sales = validated_data.pop('sales')
        transaction = SalesTransaction.objects.create(**validated_data)

        products_cache = {}
        brands_cache = {}
        desc = f'Sales credited for :\n'

        # Create each Sale and update Product/Brand counts/stocks
        for sale in sales:
            desc += f"{sale.get('product', {})} - {sale.get('quantity', 0)} pcs, \n"
            saleobj = Sales.objects.create(sales_transaction=transaction, **sale)

            # lock product
            product = self._get_locked_product(saleobj.product.id, products_cache)
            qty = saleobj.quantity or 0
            price = product.selling_price or 0
            product.count = (product.count or 0) - qty
            product.stock = (product.stock or 0) - qty * price
            product.save()

            # lock brand
            brand_obj = product.brand
            if brand_obj.id not in brands_cache:
                brands_cache[brand_obj.id] = brand_obj
            brand = brands_cache[brand_obj.id]
            brand.count = (brand.count or 0) - qty
            brand.stock = (brand.stock or 0) - qty * price
            brand.save()

        transaction.calculate_total_amount()

        if transaction.method == 'credit':
            debtor_id = transaction.debtor.id
            debtor = Debtor.objects.select_for_update().get(id=debtor_id)
            DebtorTransactionSerializer().create({
                'debtor': debtor,
                'amount': -transaction.credited_amount,
                'date': transaction.date,
                'method': transaction.method,
                'desc': desc,
                'all_sales_transaction': transaction,
                'branch': transaction.branch,
                'enterprise': transaction.enterprise
            })
        return transaction

    @transaction.atomic
    def update(self, instance, validated_data):
        old_date = instance.date
        old_method = instance.method
        old_total = instance.total_amount or 0
        old_debtor = instance.debtor
        old_credited_amount = instance.credited_amount or 0
        old_amount_paid = instance.amount_paid or 0
        sales_data = validated_data.pop('sales', [])

        # Update transaction fields
        for attr, value in validated_data.items():
            if attr == 'returned':
                continue  # 'returned' is handled separately
            setattr(instance, attr, value)
        instance.save()

        products_cache = {}
        brands_cache = {}
        desc = f'Sales credited for :\n'

        def get_product_obj(prod):
            return self._get_locked_product(prod.id, products_cache)

        # Keep track of existing sales
        existing_sales = {sale.id: sale for sale in instance.sales.all()}
        new_sales_ids = []

        for sale_data in sales_data:
            desc += f"{sale_data.get('product', {})} - {sale_data.get('quantity', 0)} pcs, \n"
            sale_id = sale_data.get('id')
            if sale_id and sale_id in existing_sales:
                sale_inst = existing_sales.pop(sale_id)

                # lock old & new products
                old_prod = get_product_obj(sale_inst.product)
                old_qty = sale_inst.quantity or 0
                new_prod = sale_data.get('product', old_prod)
                new_prod = get_product_obj(new_prod)
                new_qty = sale_data.get('quantity', old_qty) or 0
                price_old = old_prod.selling_price or 0
                price_new = new_prod.selling_price or 0

                # If product changed
                if old_prod != new_prod:
                    # restore old product/brand
                    old_prod.count = (old_prod.count or 0) + old_qty
                    old_prod.stock = (old_prod.stock or 0) + old_qty * price_old
                    old_prod.save()
                    br_old = old_prod.brand
                    if br_old.id not in brands_cache:
                        brands_cache[br_old.id] = br_old
                    br_old = brands_cache[br_old.id]
                    br_old.count = (br_old.count or 0) + old_qty
                    br_old.stock = (br_old.stock or 0) + old_qty * price_old
                    br_old.save()

                    # deduct from new product/brand
                    new_prod.count = (new_prod.count or 0) - new_qty
                    new_prod.stock = (new_prod.stock or 0) - new_qty * price_new
                    new_prod.save()
                    br_new = new_prod.brand
                    if br_new.id not in brands_cache:
                        brands_cache[br_new.id] = br_new
                    br_new = brands_cache[br_new.id]
                    br_new.count = (br_new.count or 0) - new_qty
                    br_new.stock = (br_new.stock or 0) - new_qty * price_new
                    br_new.save()
                else:
                    # adjust same product
                    qty_diff = new_qty - old_qty
                    stock_diff = qty_diff * price_old
                    old_prod.count = (old_prod.count or 0) - qty_diff
                    old_prod.stock = (old_prod.stock or 0) - stock_diff
                    old_prod.save()
                    br = old_prod.brand
                    if br.id not in brands_cache:
                        brands_cache[br.id] = br
                    br = brands_cache[br.id]
                    br.count = (br.count or 0) - qty_diff
                    br.stock = (br.stock or 0) - stock_diff
                    br.save()

                # update sale fields
                for attr, val in sale_data.items():
                    setattr(sale_inst, attr, val)
                sale_inst.save()
                new_sales_ids.append(sale_inst.id)

            else:
                # new sale
                sale_data['sales_transaction'] = instance
                new_sale = Sales.objects.create(**sale_data)
                prod = self._get_locked_product(new_sale.product.id, products_cache)
                qty = new_sale.quantity or 0
                price = prod.selling_price or 0
                prod.count = (prod.count or 0) - qty
                prod.stock = (prod.stock or 0) - qty * price
                prod.save()
                br = prod.brand
                if br.id not in brands_cache:
                    brands_cache[br.id] = br
                br = brands_cache[br.id]
                br.count = (br.count or 0) - qty
                br.stock = (br.stock or 0) - qty * price
                br.save()
                new_sales_ids.append(new_sale.id)

        # remove deleted sales
        for removed in existing_sales.values():
            prod = self._get_locked_product(removed.product.id, products_cache)
            old_qty = removed.quantity or 0
            price = prod.selling_price or 0
            prod.count = (prod.count or 0) + old_qty
            prod.stock = (prod.stock or 0) + old_qty * price
            prod.save()
            br = prod.brand
            if br.id not in brands_cache:
                brands_cache[br.id] = br
            br = brands_cache[br.id]
            br.count = (br.count or 0) + old_qty
            br.stock = (br.stock or 0) + old_qty * price
            br.save()
            removed.delete()

        instance.calculate_total_amount()
        instance.save()
        new_method = instance.method
        new_date = instance.date
        new_total = instance.total_amount or 0

        if old_date != new_date:
            dts = DebtorTransaction.objects.filter(all_sales_transaction=instance)
            for dt in dts:
                dt.date = new_date
                dt.save()

        if old_method != new_method or old_total != new_total or old_debtor != instance.debtor or old_credited_amount != instance.credited_amount or old_amount_paid != instance.amount_paid:
            dts = DebtorTransaction.objects.filter(all_sales_transaction=instance)
            for dt in dts:
                dt.delete()
            if instance.debtor:
                instance.debtor.refresh_from_db()
            if instance.method == 'credit':
                # Base transaction
                base = {
                    'debtor': instance.debtor,
                    'date': instance.date,
                    'branch': instance.branch,
                    'enterprise': instance.enterprise,
                    'method': instance.method,
                    'amount': -instance.credited_amount,
                    'desc': f'Sale credited for transaction {instance.id} with bill number {instance.bill_no}',
                    'all_sales_transaction': instance,
                }
                DebtorTransactionSerializer().create(base)

        return instance

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['date'] = instance.date.strftime('%Y-%m-%d')
        return rep


class VendorTransactionSerializer(serializers.ModelSerializer):
    date = serializers.DateField()
    vendor_name = serializers.SerializerMethodField()
    class Meta:
        model = VendorTransactions
        fields = '__all__'

    def get_vendor_name(self,obj):
        return obj.vendor.name
    
    @transaction.atomic
    def create(self, validated_data):
        transaction = VendorTransactions.objects.create(**validated_data)
        vendor = transaction.vendor
        vendor.due = (vendor.due - transaction.amount) if vendor.due is not None else -transaction.amount
        vendor.save()
        transaction.due = vendor.due
        transaction.save()
        return transaction
    
    @transaction.atomic
    def update(self, instance, validated_data):

        old_vendor = instance.vendor
        old_amount = instance.amount
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        instance.refresh_from_db()
        new_vendor = instance.vendor

        if old_vendor == new_vendor:
            new_vendor.due = (new_vendor.due - instance.amount + old_amount) if new_vendor.due is not None else -instance.amount + old_amount
            new_vendor.save()

        else:
            old_vendor.due = old_vendor.due + old_amount
            new_vendor.due = (new_vendor.due - instance.amount) if new_vendor.due is not None else -instance.amount
            old_vendor.save()
            new_vendor.save()

        instance.due = new_vendor.due
        instance.save()
        return instance
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Format the date in 'YYYY-MM-DD' format for the response
        representation['date'] = instance.date.strftime('%Y-%m-%d')
        return representation
    
class PurchaseReturnSerializer(serializers.ModelSerializer):
   
    purchase_transaction = PurchaseTransactionSerializer(read_only=True)
    # purchases = PurchaseSerializer(many=True,read_only=True) ##related name

    # Write-only fields for accepting the IDs in the request
    purchase_transaction_id = serializers.PrimaryKeyRelatedField(
        queryset=PurchaseTransaction.objects.all(),
        write_only=True,
        source='purchase_transaction'
    )
    # purchase_ids = serializers.PrimaryKeyRelatedField(
    #     many=True,
    #     queryset=Purchase.objects.all(),
    #     write_only=True
    # )
    returns = serializers.ListField(write_only=True, required = False)
    returned_purchases = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseReturn
        # fields = '__all__'
        fields = [
            'id',
            'date',
            'branch',
            'enterprise',
            'purchase_transaction',
            'purchase_transaction_id',  # for write
            # 'purchases',       # for read
            # 'purchase_ids' ,    # for write
            'returns',
            'returned_purchases',
        ]
    @transaction.atomic
    def create(self, validated_data):
        # purchase_ids = validated_data.pop('purchase_ids', [])
        returns = validated_data.pop('returns', [])
        purchase_transaction = validated_data.get('purchase_transaction')
        purchase_return = PurchaseReturn.objects.create(**validated_data)
        vendor = purchase_return.purchase_transaction.vendor
        # total_unit_price = 0

        amount_diff = 0
        desc = "Purchase return:"
        # Memory cache
        products_cache = {}
        brands_cache = {}

        # for purchase in purchase_ids:
        for data in returns:
            purchase = Purchase.objects.get(id=data['id'])
            purchase.purchase_return = purchase_return
            purchase.returned = True
            purchase.returned_quantity = data['quantity']
            purchase.save()
            # total_unit_price += purchase.unit_price * purchase.quantity

            # # Cache product
            # product_id = purchase.product.id
            # if product_id not in products_cache:
            #     products_cache[product_id] = purchase.product
            # product = products_cache[product_id]
            # product.count = (product.count or 0) - purchase.quantity
            # product.stock = (product.stock or 0) - purchase.quantity * product.selling_price

            # # Cache brand
            # brand_id = product.brand.id
            # if brand_id not in brands_cache:
            #     brands_cache[brand_id] = product.brand
            # brand = brands_cache[brand_id]
            # brand.count = (brand.count or 0) - purchase.quantity
            # brand.stock = (brand.stock or 0) - purchase.quantity * product.selling_price
            desc += f"{data['quantity']} x {purchase.product.name}, \n"


            pid = purchase.product.id
            if pid not in products_cache:
                products_cache[pid] = purchase.product
            product = products_cache[pid]
            product.count = (product.count or 0) - data['quantity']
            product.stock = (product.stock or 0) - data['quantity'] * product.selling_price

            bid = product.brand.id
            if bid not in brands_cache:
                brands_cache[bid] = product.brand
            brand = brands_cache[bid]
            brand.count = (brand.count or 0) - data['quantity']
            brand.stock = (brand.stock or 0) - data['quantity'] * product.selling_price

            returned_quantity = data['quantity']
            amount_diff += returned_quantity * purchase.unit_price
        # Save all cached products and brands
        for product in products_cache.values():
            product.save()
        for brand in brands_cache.values():
            brand.save()

        if purchase_transaction.vendor:
            vendor = purchase_transaction.vendor
            if vendor.due is None:
                vendor.due = 0
            
            VendorTransactionSerializer().create({
                'vendor': vendor,
                'date': purchase_return.date,
                'amount': amount_diff,
                'desc': desc,
                'purchase_transaction': purchase_return.purchase_transaction,
                'enterprise': purchase_return.enterprise,
                'branch': purchase_return.branch,
                'enterprise': purchase_return.enterprise,
                'bill_no': purchase_return.purchase_transaction.bill_no,
                'type': 'return'
            })

        return purchase_return
    
    @transaction.atomic
    def delete(self, instance):
        purchases = instance.purchases.all()
        # Memory cache
        products_cache = {}
        brands_cache = {}

        for purchase in purchases:
            purchase.returned = False
            returned_quantity = purchase.returned_quantity
            purchase.returned_quantity = 0
            purchase.purchase_return = None
            purchase.save()


            pid = purchase.product.id
            if pid not in products_cache:
                products_cache[pid] = purchase.product
            product = products_cache[pid]
            product.count = (product.count or 0) + returned_quantity
            product.stock = (product.stock or 0) + returned_quantity * product.selling_price

            bid = product.brand.id
            if bid not in brands_cache:
                brands_cache[bid] = product.brand
            brand = brands_cache[bid]
            brand.count = (brand.count or 0) + returned_quantity
            brand.stock = (brand.stock or 0) + returned_quantity * product.selling_price


        for product in products_cache.values():
            product.save()
        for brand in brands_cache.values():
            brand.save()

        vt = VendorTransactions.objects.filter(purchase_transaction=instance.purchase_transaction, type="return")
        if vt:
            for v in vt:
                v.delete()

        instance.delete()
        return instance

    def get_returned_purchases(self, obj):
        
        purchases = Purchase.objects.filter(purchase_return=obj, returned = True)
        result = []
        for purchase in purchases:
            result.append({
                'id': purchase.id,
                'product_name': purchase.product.name,
                'quantity': purchase.returned_quantity,
                'unit_price': purchase.unit_price,
                'total_price': purchase.returned_quantity * purchase.unit_price
            })
        return result

class SalesReturnSerializer(serializers.ModelSerializer):
   
    sales_transaction = SalesTransactionSerializer(read_only=True)
    sales = SalesSerializer(many=True, read_only=True)  ##related name

    # Write-only fields for accepting the IDs in the request
    sales_transaction_id = serializers.PrimaryKeyRelatedField(
        queryset=SalesTransaction.objects.all(),
        write_only=True,
        source='sales_transaction'
    )
    sales_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Sales.objects.all(),
        write_only=True
    )

    class Meta:
        model = PurchaseReturn
        fields = [
            'id',
            'date',
            'branch',
            'enterprise',
            'sales_transaction',
            'sales_transaction_id',  # for write
            'sales',                 # for read
            'sales_ids',             # for write
        ]

    @transaction.atomic
    def create(self, validated_data):
        sales_ids = validated_data.pop('sales_ids', [])

        # Create the SalesReturn instance
        sales_return = SalesReturn.objects.create(**validated_data)

        # Memory caches
        products_cache = {}
        brands_cache = {}
        total_unit_price = 0

        # Attach each sale to this return
        for sale in sales_ids:
            sale.sales_return = sales_return
            sale.returned = True
            sale.save()
            total_unit_price += sale.unit_price * sale.quantity


            # Cache product
            product_id = sale.product.id
            if product_id not in products_cache:
                products_cache[product_id] = sale.product
            product = products_cache[product_id]
            product.count = (product.count or 0) + sale.quantity
            product.stock = (product.stock or 0) + sale.quantity * product.selling_price

            # Cache brand
            brand_id = product.brand.id
            if brand_id not in brands_cache:
                brands_cache[brand_id] = product.brand
            brand = brands_cache[brand_id]
            brand.count = (brand.count or 0) + sale.quantity
            brand.stock = (brand.stock or 0) + sale.quantity * product.selling_price

        # Save all cached objects once
        for product in products_cache.values():
            product.save()
        for brand in brands_cache.values():
            brand.save()
        
        if sales_return.sales_transaction.debtor:
            debtor = sales_return.sales_transaction.debtor
        
            if debtor.due is None:
                debtor.due = 0

            DebtorTransactionSerializer().create({
                'debtor': debtor,
                'date': sales_return.date,
                'amount': total_unit_price,
                'desc': f'Sales return for transaction {sales_return.sales_transaction.bill_no}',
                'method': sales_return.sales_transaction.method,
                'all_sales_transaction': sales_return.sales_transaction,
                'enterprise': sales_return.enterprise,
                'branch': sales_return.branch,
                'type': 'return'
            })

        return sales_return

    @transaction.atomic
    def delete(self, instance):
        sales_ids = instance.sales.all()

        # Memory caches
        products_cache = {}
        brands_cache = {}

        for sale in sales_ids:
            sale.returned = False
            sale.save()

            # Cache product
            product_id = sale.product.id
            if product_id not in products_cache:
                products_cache[product_id] = sale.product
            product = products_cache[product_id]
            product.count = (product.count or 0) - sale.quantity
            product.stock = (product.stock or 0) - sale.quantity * product.selling_price

            # Cache brand
            brand_id = product.brand.id
            if brand_id not in brands_cache:
                brands_cache[brand_id] = product.brand
            brand = brands_cache[brand_id]
            brand.count = (brand.count or 0) - sale.quantity
            brand.stock = (brand.stock or 0) - sale.quantity * product.selling_price

        # Save all cached objects once
        for product in products_cache.values():
            product.save()
        for brand in brands_cache.values():
            brand.save()

        if instance.sales_transaction.debtor:
            debtor = instance.sales_transaction.debtor
        dt = DebtorTransaction.objects.filter(all_sales_transaction=instance.sales_transaction, type="return")
        if dt:
            for d in dt:
                d.delete()

        instance.delete()
        return instance

class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = '__all__'

class StaffTransactionSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = StaffTransactions
        fields = '__all__'

    def create(self, validated_data):

        transaction = StaffTransactions.objects.create(**validated_data)
        staff = transaction.staff
        staff.due = (staff.due - transaction.amount) if staff.due is not None else -transaction.amount
        staff.save()
        return transaction
    
    def update(self, instance, validated_data):
        print("HERE")
        old_staff = instance.staff
        old_amount = instance.amount
        print(old_amount)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        instance.refresh_from_db()
        new_staff = instance.staff

        if old_staff == new_staff:
            new_staff.due = new_staff.due - instance.amount + old_amount
            print(new_staff.due)
            new_staff.save()
            print(new_staff.due)
            staff = Staff.objects.get(id = new_staff.id)
            print(staff.due)

        else:
            old_staff.due = old_staff.due + old_amount
            new_staff.due = new_staff.due - instance.amount
            old_staff.save()
            new_staff.save()

        return instance
    
    def get_staff_name(self,obj):
        return obj.staff.name


class DebtorTransactionSerializer(serializers.ModelSerializer):
    debtor_name = serializers.SerializerMethodField(read_only=True)
    date = serializers.DateField()
    class Meta:
        model = DebtorTransaction
        fields= '__all__'

    @transaction.atomic
    def create(self, validated_data):
        transaction = DebtorTransaction.objects.create(**validated_data)
        debtor = transaction.debtor
        debtor.due = (debtor.due - transaction.amount) if debtor.due is not None else -transaction.amount
        debtor.save()
        transaction.due = debtor.due
        transaction.save()
        return transaction
    
    @transaction.atomic
    def update(self, instance, validated_data):
        old_debtor = instance.debtor
        old_amount = instance.amount
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        instance.refresh_from_db()
        new_debtor = instance.debtor

        if old_debtor == new_debtor:
            new_debtor.due = (new_debtor.due - instance.amount + old_amount) if new_debtor.due is not None else -instance.amount + old_amount
            new_debtor.save()

        else:
            old_debtor.due = old_debtor.due + old_amount
            new_debtor.due = (new_debtor.due - instance.amount) if new_debtor.due is not None else -instance.amount
            old_debtor.save()
            new_debtor.save()
        instance.due = new_debtor.due
        instance.save()
        return instance
    
    def get_debtor_name(self, obj):
        return obj.debtor.name


class DebtorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Debtor
        fields = '__all__'