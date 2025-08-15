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
        # Clear and recreate items
        instance.items.all().delete()
        for item_data in items_data:
            OrderItem.objects.create(order=instance, **item_data)
        return instance

    def delete(self, instance, *args, **kwargs):
        instance.items.all().delete()
        return super().delete(instance, *args, **kwargs)