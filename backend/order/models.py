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
        ('fonepay', 'Fonepay'),
        ('mixed', 'Mixed'),
    ], default='cash')
    cash_advance = models.FloatField(null=True, blank=True, default=0)
    online_advance = models.FloatField(null=True, blank=True, default=0)
    card_advance = models.FloatField(null=True, blank=True, default=0)
    fonepay_advance = models.FloatField(null=True, blank=True, default=0)
    remaining_received = models.FloatField(null=True, blank=True)
    remaining_received_method = models.CharField(max_length=50, choices=[
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('online', 'Online'),
        ('fonepay', 'Fonepay'),
        ('mixed', 'Mixed'),
    ], default='cash')
    cash_remaining = models.FloatField(null=True, blank=True, default=0)
    online_remaining = models.FloatField(null=True, blank=True, default=0)
    card_remaining = models.FloatField(null=True, blank=True, default=0)
    fonepay_remaining = models.FloatField(null=True, blank=True, default=0)
    remaining_received_date = models.DateField(null=True,blank=True)
    is_ncm = models.BooleanField(default=False)
    prepaid = models.BooleanField(default=False)
    prepaid_method = models.CharField(max_length=50, choices=[
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('online', 'Online Payment'),
        ('fonepay', 'Fonepay'),
        ('credit', 'Credit Amount'),
    ], default='online')
    cod_amount = models.FloatField(null=True, blank=True, default=0)
    delivery_charge = models.FloatField(null=True, blank=True, default=0)

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

    @property
    def effective_advance_method(self):
        if self.is_ncm:
            return self.prepaid_method if self.prepaid else 'credit'
        return self.advance_method

    @property
    def effective_remaining_method(self):
        if self.is_ncm:
            return 'credit'
        return self.remaining_received_method

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    item = models.CharField(max_length=255, null=True, blank=True)
    image = models.ImageField(upload_to='order_items/', null=True, blank=True)
