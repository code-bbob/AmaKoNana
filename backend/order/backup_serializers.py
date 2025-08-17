from rest_framework.serializers import ModelSerializer
from .models import Order, OrderItem

class OrderItemSerializer(ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'item', 'image']

class OrderSerializer(ModelSerializer):
    # Use the related_name 'items' from OrderItem.order
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = '__all__'

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items')
        instance = super().update(instance, validated_data)
        #do not delete the existing items and create a new one, just modify them acc to the data and delete the ones not present
        existing_items = instance.items.all()
        for item_data in items_data:
            item_id = item_data.get('id')
            if item_id:
                # Update existing item
                item = existing_items.filter(id=item_id).first()
                if item:
                    for attr, value in item_data.items():
                        setattr(item, attr, value)
                    item.save()
            else:
                # Create new item
                OrderItem.objects.create(order=instance, **item_data)
        # Delete items that are no longer present
        existing_item_ids = [item.get('id') for item in items_data if item.get('id')]
        existing_items.exclude(id__in=existing_item_ids).delete()
        return instance

    def delete(self, instance, *args, **kwargs):
        instance.items.all().delete()
        return super().delete(instance, *args, **kwargs)