from django.db import models

# Create your models here.


class Order(models.Model):
    bill_no = models.CharField(max_length=10, null=True, blank=True)
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=15)
    received_date = models.DateField(auto_now_add=True)
    total_amount = models.FloatField(null=True, blank=True)
    advance_received = models.FloatField(null=True, blank=True)
    advance_method = models.CharField(max_length=50, choices=[
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('online', 'Online Payment'),
    ], default='cash')
    remaining_received = models.FloatField(null=True, blank=True)
    remaining_received_method = models.CharField(max_length=50, choices=[
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('online', 'Online')
    ], default='cash')
    remaining_received_date = models.DateField(null=True,blank=True)

    status = models.CharField(max_length=50, choices=[
        ('pending', 'Pending'),
        ('prepared', 'Prepared'),
        ('dispatched', 'Dispatched'),
        ('completed', 'Completed'),
        ('canceled', 'Canceled'),
    ], default='pending')

    enterprise = models.ForeignKey('enterprise.Enterprise', on_delete=models.CASCADE)
    branch = models.ForeignKey('enterprise.Branch', on_delete=models.CASCADE)
    due_date = models.DateField(null=True, blank=True)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    item = models.CharField(max_length=255, null=True, blank=True)
    image = models.ImageField(upload_to='order_items/', null=True, blank=True)
