from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from .models import Order, OrderItem

class OrderItemSerializer(ModelSerializer):
    id = serializers.IntegerField(required=False)  # Make id field explicit and optional
    
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
        print(f"=== OrderSerializer.update called ===")
        print(f"Instance: Order {instance.id}")
        print(f"Validated data: {validated_data}")

        # Get the raw items data before DRF processes it
        raw_items_data = None
        if hasattr(self, 'initial_data') and 'items' in self.initial_data:
            raw_items_data = self.initial_data['items']
            print(f"Raw items data from initial_data: {raw_items_data}")

        items_data = validated_data.pop('items', None)
        print(f"Validated items data: {items_data}")
        
        # Use raw items data if available (contains the id fields)
        if raw_items_data is not None:
            items_data = raw_items_data
            print(f"Using raw items data instead: {items_data}")
        
        # Update scalar fields first
        instance = super().update(instance, validated_data)

        if items_data is None:
            print("No item modifications requested")
            # No item modifications requested
            return instance

        # Track existing items by id for efficient lookups
        existing_items = {item.id: item for item in instance.items.all()}
        print(f"Existing items: {list(existing_items.keys())}")
        received_ids = set()

        for item_dict in items_data:
            print(f"Processing item_dict: {item_dict}")
            item_id = item_dict.get('id')
            
            # Convert string id to integer if needed
            if item_id is not None:
                try:
                    item_id = int(item_id)
                except (ValueError, TypeError):
                    item_id = None
            
            if item_id and item_id in existing_items:
                print(f"Updating existing item {item_id}")
                received_ids.add(item_id)
                order_item = existing_items[item_id]
                
                print(f"Current item image: {order_item.image}")
                
                # Update text field(s)
                if 'item' in item_dict:
                    print(f"Updating item text from '{order_item.item}' to '{item_dict['item']}'")
                    order_item.item = item_dict['item']
                    
                # Handle image updates - only if image field is explicitly provided
                if 'image' in item_dict:
                    print(f"Image field present in item_dict: {item_dict['image']}")
                    if item_dict['image'] == '':
                        # Empty string means clear existing image
                        print("Clearing existing image")
                        order_item.image = None
                    elif item_dict['image'] is not None:
                        # New file provided
                        print(f"Setting new image: {item_dict['image']}")
                        order_item.image = item_dict['image']
                    # If image is None (null), keep existing image (do nothing)
                    else:
                        print("Image is None, keeping existing image")
                else:
                    print("No image field in item_dict, preserving existing image")
                # If 'image' field is not in item_dict at all, preserve existing image
                
                print(f"Saving item {item_id} with image: {order_item.image}")
                order_item.save()
            else:
                print(f"Creating new item: {item_dict}")
                # New item (ignore id if invalid/missing)
                image_value = item_dict.get('image')
                # For new items, empty string also means no image
                if image_value == '':
                    image_value = None
                OrderItem.objects.create(order=instance, item=item_dict.get('item', ''), image=image_value)

        # Delete items that were not re-submitted
        to_delete = [iid for iid in existing_items.keys() if iid not in received_ids]
        print(f"Items to delete: {to_delete}")
        if to_delete:
            OrderItem.objects.filter(id__in=to_delete).delete()

        print("=== OrderSerializer.update completed ===")
        return instance

    def delete(self, instance, *args, **kwargs):
        instance.items.all().delete()
        return super().delete(instance, *args, **kwargs)