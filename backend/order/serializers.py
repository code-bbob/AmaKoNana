from rest_framework.serializers import ModelSerializer
from .models import Order, OrderItem

class OrderItemSerializer(ModelSerializer):
    class Meta:
        model = OrderItem
        fields = '__all__'

class OrderSerializer(ModelSerializer):
    order_item = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = '__all__'

    def create(self, validated_data):
        order_items_data = validated_data.pop('order_item')
        order = Order.objects.create(**validated_data)
        for item_data in order_items_data:
            OrderItem.objects.create(order=order, **item_data)
        return order

    def update(self, instance, validated_data):
        order_items_data = validated_data.pop('order_item')
        instance = super().update(instance, validated_data)
        instance.order_item.all().delete()
        for item_data in order_items_data:
            OrderItem.objects.create(order=instance, **item_data)
        return instance
    
    def delete(self, instance, *args, **kwargs):
        instance.order_item.all().delete()
        return super().delete(instance, *args, **kwargs)