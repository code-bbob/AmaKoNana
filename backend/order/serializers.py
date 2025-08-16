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
        """Custom update that preserves existing OrderItems and their images unless explicitly changed.

        Expected client behavior:
        - Send an "items" array with objects. Existing items include their "id" field.
        - For an existing item, omit the "image" field or send null to keep current image; send a new file to replace.
        - Send empty string for "image" field to clear/remove existing image.
        - To delete an item, simply omit that item's id from the submitted list.
        - To add a new item, include object without an id.
        If the client does not send an "items" key (e.g. partial update of other fields), item relations are untouched.
        """

        items_data = validated_data.pop('items', None)
        # Update scalar fields first
        instance = super().update(instance, validated_data)

        if items_data is None:
            # No item modifications requested
            return instance

        # Track existing items by id for efficient lookups
        existing_items = {item.id: item for item in instance.items.all()}
        received_ids = set()

        for item_dict in items_data:
            item_id = item_dict.get('id')
            if item_id and item_id in existing_items:
                received_ids.add(item_id)
                order_item = existing_items[item_id]
                # Update text field(s)
                if 'item' in item_dict:
                    order_item.item = item_dict['item']
                # Handle image updates
                if 'image' in item_dict:
                    if item_dict['image'] == '':
                        # Empty string means clear existing image
                        order_item.image = None
                    elif item_dict['image'] is not None:
                        # New file provided
                        order_item.image = item_dict['image']
                    # If image is None (null), keep existing image (do nothing)
                order_item.save()
            else:
                # New item (ignore id if invalid/missing)
                image_value = item_dict.get('image')
                # For new items, empty string also means no image
                if image_value == '':
                    image_value = None
                OrderItem.objects.create(order=instance, item=item_dict.get('item', ''), image=image_value)

        # Delete items that were not re-submitted
        to_delete = [iid for iid in existing_items.keys() if iid not in received_ids]
        if to_delete:
            OrderItem.objects.filter(id__in=to_delete).delete()

        return instance

    def delete(self, instance, *args, **kwargs):
        instance.items.all().delete()
        return super().delete(instance, *args, **kwargs)