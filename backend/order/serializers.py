from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from .models import Order, OrderItem

class OrderItemSerializer(ModelSerializer):
    id = serializers.IntegerField(required=False)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'item', 'image']

class OrderSerializer(ModelSerializer):
    items = OrderItemSerializer(many=True)
    branch_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = '__all__'

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else None

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        return order

    def update(self, instance, validated_data):
        # Handle FormData format by parsing initial_data
        items_data = validated_data.pop('items', None)
        
        # Check if we have FormData format in initial_data
        if hasattr(self, 'initial_data'):
            # Handle FormData items[0]id format
            if any(key.startswith('items[') for key in self.initial_data.keys()):
                items_dict = {}
                for key, value in self.initial_data.items():
                    if key.startswith('items[') and ']' in key:
                        parts = key.split(']', 1)
                        try:
                            index = int(parts[0].replace('items[', ''))
                            field_name = parts[1] if len(parts) > 1 else ''
                            
                            if index not in items_dict:
                                items_dict[index] = {}
                                
                            if field_name == 'id':
                                value = int(value)
                            items_dict[index][field_name] = value
                        except (ValueError, IndexError):
                            continue
                
                if items_dict:
                    items_data = [items_dict[i] for i in sorted(items_dict.keys())]
            
            # Handle JSON format - use initial_data to preserve id fields
            elif 'items' in self.initial_data:
                items_data = self.initial_data['items']
        
        # Update scalar fields
        instance = super().update(instance, validated_data)

        if items_data is None:
            return instance

        # Track existing items
        existing_items = {item.id: item for item in instance.items.all()}
        received_ids = set()

        for item_dict in items_data:
            item_id = item_dict.get('id')
            if item_id:
                item_id = int(item_id) if isinstance(item_id, str) else item_id
            
            if item_id and item_id in existing_items:
                # Update existing item
                received_ids.add(item_id)
                order_item = existing_items[item_id]
                
                if 'item' in item_dict:
                    order_item.item = item_dict['item']
                    
                if 'image' in item_dict:
                    if item_dict['image'] == '':
                        order_item.image = None
                    elif item_dict['image'] is not None:
                        order_item.image = item_dict['image']
                
                order_item.save()
            else:
                # Create new item
                image_value = item_dict.get('image')
                if image_value == '':
                    image_value = None
                OrderItem.objects.create(order=instance, item=item_dict.get('item', ''), image=image_value)

        # Delete items not received
        to_delete = [iid for iid in existing_items.keys() if iid not in received_ids]
        if to_delete:
            OrderItem.objects.filter(id__in=to_delete).delete()

        return instance

    def delete(self, instance, *args, **kwargs):
        instance.items.all().delete()
        instance.delete()
        return