from rest_framework.serializers import ModelSerializer, SerializerMethodField
from .models import Brand, Product
from .models import ManufactureItem,Manufacture
from django.db import transaction

class BrandSerializer(ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'
    
class ProductSerializer(ModelSerializer):
    brandName = SerializerMethodField()
    class Meta:
        model = Product
        fields = '__all__'
    def get_brandName(self,obj):
        return obj.brand.name


class ManufactureItemSerializer(ModelSerializer):
    product_name = SerializerMethodField()
    class Meta:
        model = ManufactureItem
        fields = ['id', 'product', 'quantity', 'product_name']

    def get_product_name(self, obj):
        return obj.product.name

# class ManufactureSerializer(ModelSerializer):

#     manufacture_items = ManufactureItemSerializer(many=True)

#     class Meta:
#         model = Manufacture
#         fields = '__all__'

#     @transaction.atomic
#     def create(self, validated_data):
#         manufacture_items = validated_data.pop('manufacture_items')
#         manufacture = Manufacture.objects.create(**validated_data)
#         for manufacture_item in manufacture_items:
#             ManufactureItem.objects.create(manufacture=manufacture, **manufacture_item)
#             product_id = manufacture_item.get('product')
#             print(product_id)
#             product = Product.objects.get(id=product_id)
#             product.count += manufacture_item.get('quantity', 0)
#             product.stock += manufacture_item.get('quantity', 0) * product.selling_price
#             product.save()
#             brand = product.brand
#             brand.refresh_from_db()
#             brand.count += manufacture_item.get('quantity', 0) * product.selling_price
#             brand.save()
#         return manufacture

#     @transaction.atomic
#     def update(self, instance, validated_data):
#         manufacture_items = validated_data.pop('manufacture_items', [])
#         instance = super().update(instance, validated_data)
#         instance.manufacture_items.all().delete()
#         for manufacture_item in manufacture_items:
#             ManufactureItem.objects.create(manufacture=instance, **manufacture_item)
#             product = Product.objects.get(id=manufacture_item.get('product'))
#             product.count += manufacture_item.get('quantity', 0)
#             product.stock += manufacture_item.get('quantity', 0) * product.selling_price
#             product.save()
#             brand = product.brand
#             brand.refresh_from_db()
#             brand.count += manufacture_item.get('quantity', 0) * product.selling_price
#             brand.save()

#         return instance

#     @transaction.atomic
#     def delete(self, instance, *args, **kwargs):
        
#         for manufacture_item in instance.manufacture_items.all():
#             manufacture_item.delete()

#         instance.delete()



class ManufactureSerializer(ModelSerializer):
    manufacture_items = ManufactureItemSerializer(many=True)

    class Meta:
        model = Manufacture
        fields = '__all__'

    @transaction.atomic
    def create(self, validated_data):
        """
        Creates a new Manufacture instance and its related ManufactureItems.
        Also updates product and brand counts atomically, acquiring locks on
        Product and Brand instances to prevent race conditions.
        """
        manufacture_items_data = validated_data.pop('manufacture_items')
        manufacture = Manufacture.objects.create(**validated_data)

        for item_data in manufacture_items_data:
            # The 'product' in validated_data is the full object.
            # We fetch it again with a lock to be safe.
            product = Product.objects.select_for_update().get(id=item_data.get('product').id)
            quantity = item_data.get('quantity', 0)

            # Update the Product count and stock
            product.count += quantity
            product.stock += quantity * product.selling_price
            product.save()

            # Acquire a lock on the Brand row to prevent race conditions
            brand = Brand.objects.select_for_update().get(id=product.brand_id)
            brand.count += quantity
            brand.stock += quantity * product.selling_price
            brand.save()

            # Create the ManufactureItem using the validated data
            ManufactureItem.objects.create(manufacture=manufacture, **item_data)
        
        return manufacture

    @transaction.atomic
    def update(self, instance, validated_data):
        """
        Updates an existing Manufacture instance.
        This method replaces all old ManufactureItems with new ones.
        It first reverses the old counts and then applies the new ones,
        locking both Product and Brand instances throughout the process.
        """
        manufacture_items_data = validated_data.pop('manufacture_items', [])

        # The super().update() handles the simple fields on the Manufacture model
        instance = super().update(instance, validated_data)

        # First, reverse the counts from the old items
        for old_item in instance.manufacture_items.all():
            # Get the product with a lock to prevent race conditions
            product = Product.objects.select_for_update().get(id=old_item.product.id)
            quantity = old_item.quantity

            product.count -= quantity
            product.stock -= quantity * product.selling_price
            product.save()

            # Acquire a lock on the Brand row to prevent race conditions
            brand = Brand.objects.select_for_update().get(id=product.brand_id)
            brand.count -= quantity * product.selling_price
            brand.save()

        # Delete the old items
        instance.manufacture_items.all().delete()
        
        # Then, create the new items and update counts
        for item_data in manufacture_items_data:
            # Get the product with a lock to prevent race conditions
            product = Product.objects.select_for_update().get(id=item_data.get('product').id)
            quantity = item_data.get('quantity', 0)

            product.count += quantity
            product.stock += quantity * product.selling_price
            product.save()

            # Acquire a lock on the Brand row to prevent race conditions
            brand = Brand.objects.select_for_update().get(id=product.brand_id)
            brand.count += quantity * product.selling_price
            brand.save()

            # Create the new item
            ManufactureItem.objects.create(manufacture=instance, **item_data)

        return instance

    def delete(self, instance, *args, **kwargs):
        """
        Deletes a Manufacture instance and reverses the stock changes.
        """
        with transaction.atomic():
            for manufacture_item in instance.manufacture_items.all():
                # Get the product with a lock to prevent race conditions
                product = Product.objects.select_for_update().get(id=manufacture_item.product.id)
                quantity = manufacture_item.quantity

                product.count -= quantity
                product.stock -= quantity * product.selling_price
                product.save()

                # Lock the brand and reverse the count
                brand = Brand.objects.select_for_update().get(id=product.brand_id)
                brand.count -= quantity * product.selling_price
                brand.save()

                # Now delete the item
                manufacture_item.delete()
            
            # Finally, delete the Manufacture instance itself
            instance.delete()
