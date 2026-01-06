from django.db import models
from allinventory.models import Brand
from enterprise.models import Enterprise,Branch
from django.db import transaction

class Vendor(models.Model):
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=10,null=True,blank=True)
    # brand = models.ForeignKey(Brand, on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True)
    due = models.FloatField(null=True,blank=True)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='all_vendor')

    def __str__(self):
        return self.name

class PurchaseTransaction(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, null=True, blank=True)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='all_purchase_transaction')
    branch = models.ForeignKey(Branch,related_name='purchase_transaction',on_delete=models.CASCADE, null=True, blank=True)
    bill_no = models.CharField(max_length=20)
    total_amount = models.FloatField(null=True,blank=True)
    date = models.DateField()
    method = models.CharField(max_length=20,choices=(('cash','Cash'),('credit','Credit'),('cheque','Cheque'),('transfer','transfer')),default='credit')
    cheque_number = models.CharField(max_length=10,null=True,blank=True)
    cashout_date = models.DateField(null=True)
    person = models.ForeignKey('enterprise.Person', on_delete=models.SET_NULL, null=True, blank=True)
    def __str__(self):
        return self.vendor.name if self.vendor else f"Purchase Transaction {self.pk}"
    
    def calculate_total_amount(self):
        total = sum(purchase.total_price for purchase in self.purchase.all())
        self.total_amount = total
        self.save()
        return self.total_amount
    
    def save(self, *args, **kwargs):
        if self.pk is None:
            super().save(*args, **kwargs)
        
        # Now the instance is saved, we can safely filter related Items
        #print("Calculating quantity......................")
        self.total_amount = Purchase.objects.filter(purchase_transaction=self).aggregate(models.Sum('total_price'))['total_price__sum']

        # Call save again to update the quantity field
        super().save()

class PurchaseReturn(models.Model):
    date = models.DateField(auto_now_add=True)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='all_purchase_return')
    branch = models.ForeignKey(Branch,related_name='purchase_return',on_delete=models.CASCADE, null=True, blank=True)
    purchase_transaction = models.ForeignKey(PurchaseTransaction, on_delete=models.CASCADE,related_name='purchase_return')
    
class Purchase(models.Model):
    # vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    product = models.ForeignKey('allinventory.Product', on_delete=models.CASCADE)
    quantity = models.IntegerField()
    unit_price = models.FloatField()
    total_price = models.FloatField(blank=True,null=True)
    purchase_transaction = models.ForeignKey(PurchaseTransaction, on_delete=models.CASCADE,related_name='purchase')
    returned = models.BooleanField(default=False)
    purchase_return = models.ForeignKey(
        PurchaseReturn,
        on_delete=models.SET_NULL,   # or CASCADE
        null=True,
        blank=True,
        related_name='purchases'
    )
    returned_quantity = models.IntegerField(null=True, blank=True, default=0)

    
    def __str__(self):
        return self.product.name
    
    def save(self, *args, **kwargs):
        if self.pk is None:
            super().save(*args, **kwargs)
        
        # Now the instance is saved, we can safely filter related Items
        #print("Calculating quantity......................")
        self.total_price = self.quantity * self.unit_price 

        # Call save again to update the quantity field
        super().save()

class SalesTransaction(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='all_sales_transaction')
    name = models.CharField(max_length=255,null=True,blank=True)
    phone_number = models.CharField(max_length=10,null=True,blank=True)
    total_amount = models.FloatField(null=True,blank=True)
    date = models.DateField()
    bill_no = models.IntegerField()
    branch = models.ForeignKey(Branch,related_name='sales_transaction',on_delete=models.CASCADE, null=True, blank=True)
    subtotal = models.FloatField(null=True,blank=True)
    method = models.CharField(max_length=20,choices=(('cash','cash'),('online','online'),('card','card'),('credit','credit'),('mixed','mixed'),('transfer','transfer')),default='cash')
    cash_amount = models.FloatField(null=True,blank=True,default=0)
    online_amount = models.FloatField(null=True,blank=True,default=0)
    card_amount = models.FloatField(null=True,blank=True,default=0)
    debtor = models.ForeignKey('Debtor', on_delete=models.CASCADE, null=True, blank=True, related_name='all_sales_transaction')
    credited_amount = models.FloatField(null=True,blank=True,default=0)
    amount_paid = models.FloatField(null=True,blank=True,default=0)
    person = models.ForeignKey('enterprise.Person', on_delete=models.SET_NULL, null=True, blank=True)
    def __str__(self):
        return f"Sales Transaction {self.pk} of {self.enterprise.name}"
    
    def calculate_total_amount(self):
        total = sum((sales.unit_price * sales.quantity - sales.discount) for sales in self.sales.all())
        self.total_amount = total
        self.save()
        return self.total_amount
    
    def save(self, *args, **kwargs):
        if self.pk is None:
            super().save(*args, **kwargs)
        super().save()


class SalesReturn(models.Model):
    date = models.DateField(auto_now_add=True)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='sales_return')
    branch = models.ForeignKey(Branch,related_name='sales_return',on_delete=models.CASCADE, null=True, blank=True)
    sales_transaction = models.ForeignKey(SalesTransaction, on_delete=models.CASCADE,related_name='sales_return')
    
class Sales(models.Model):
    product = models.ForeignKey('allinventory.Product', on_delete=models.CASCADE)
    quantity = models.IntegerField()
    unit_price = models.FloatField()
    total_price = models.FloatField(null=True,blank=True)
    discount = models.FloatField(default=0)
    sales_transaction = models.ForeignKey(SalesTransaction, on_delete=models.CASCADE,related_name='sales')
    returned = models.BooleanField(default=False)
    sales_return = models.ForeignKey(
        SalesReturn,
        on_delete=models.SET_NULL,   # or CASCADE
        null=True,
        blank=True,
        related_name='sales'
    )
    returned_quantity = models.IntegerField(null=True, blank=True, default=0)
    
    def __str__(self):
        return self.product.name
    
    def save(self, *args, **kwargs):
        if self.pk is None:
            super().save(*args, **kwargs)
        
        # Now the instance is saved, we can safely filter related Items
        #print("Calculating quantity......................")
        self.total_price = self.quantity * self.unit_price - self.discount

        # Call save again to update the quantity field
        super().save()

class VendorTransactions(models.Model):

    date = models.DateField()
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE,related_name='allvendors')
    amount = models.FloatField(null=True,blank=True)
    method = models.CharField(max_length=20,choices=(('cash','Cash'),('credit','Credit'),('cheque','Cheque')),default='cash')
    cheque_number = models.CharField(max_length=255,null=True,blank=True)
    cashout_date = models.DateField(null=True)
    enterprise = models.ForeignKey('enterprise.Enterprise', on_delete=models.CASCADE,related_name='all_vendor_transactions')
    desc = models.CharField(max_length=1000,null=True,blank=True)
    branch = models.ForeignKey('enterprise.Branch', on_delete=models.CASCADE, null=True, blank=True)
    purchase_transaction = models.ForeignKey(PurchaseTransaction, on_delete=models.CASCADE,related_name="vendor_transaction",null=True,blank=True)
    base = models.BooleanField(default=False)
    type = models.CharField(max_length=20,choices=(('base','base'),('return','return'),('payment','payment')),default='base')
    # due = models.FloatField(null=True,blank=True,default=0)
    bill_no = models.CharField(max_length=20, null=True, blank=True)
    def __str__(self):
        return f"Vendor Transaction {self.pk} of {self.vendor.name}"
    
    @transaction.atomic
    def delete(self, *args, **kwargs):
        self.vendor.due = self.vendor.due + self.amount if self.vendor.due is not None else self.amount
        self.vendor.save() 
        super().delete(*args, **kwargs)



class Staff(models.Model):
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=10,null=True,blank=True)
    due = models.FloatField(null=True,blank=True,default=0)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='staff')
    branch = models.ForeignKey('enterprise.Branch', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.name
    


class StaffTransactions(models.Model):

    date = models.DateField()
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE,related_name='staff_transaction')
    amount = models.FloatField(null=True,blank=True)
    enterprise = models.ForeignKey('enterprise.Enterprise', on_delete=models.CASCADE,related_name='all_staff_transactions')
    branch = models.ForeignKey('enterprise.Branch', on_delete=models.CASCADE, null=True, blank=True)
    desc = models.CharField(max_length=255)
    staff_type = models.CharField(max_length=20,choices=(('incentive','Incentive'),('salary','Salary')),default='payment')
    transaction_type = models.CharField(max_length=20,choices=(('Salary Credited','Salary Credited'),('Payment','Payment')),default='Payment')
    
    def __str__(self):
        return f"Staff Transaction {self.pk} of {self.staff.name}"
    
    @transaction.atomic
    def delete(self, *args, **kwargs):
        self.staff.due = self.staff.due + self.amount
        self.staff.save() 
        super().delete(*args, **kwargs)

class StaffTransactionDetail(models.Model):
    staff_transaction = models.ForeignKey(StaffTransactions, on_delete=models.CASCADE,related_name='staff_transaction_details')
    quantity = models.IntegerField()
    rate = models.FloatField()
    total = models.FloatField(null=True,blank=True)
    product = models.ForeignKey('allinventory.IncentiveProduct', on_delete=models.CASCADE, null=True, blank=True) 
    def __str__(self):
        return f"Staff Transaction Detail {self.pk} of {self.staff_transaction.staff.name}"

class Customer(models.Model):
    name = models.CharField(max_length=255)
    phone_number = models.CharField(primary_key=True,max_length=10,blank=True)
    total_spent = models.FloatField(null=True,blank=True,default=0)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='customers')

    def __str__(self):
        return self.name

class Debtor(models.Model):
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=10,blank=True)
    due = models.FloatField(null=True,blank=True,default=0)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='debtors')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.name
    
class DebtorTransaction(models.Model):
    date = models.DateField()
    debtor = models.ForeignKey(Debtor, on_delete=models.CASCADE,related_name='debtor_transaction')
    amount = models.FloatField(null=True,blank=True)
    method = models.CharField(max_length=20,choices=(('cash','Cash'),('credit','Credit'),('cheque','Cheque')),default='cash')
    cheque_number = models.CharField(max_length=255,null=True,blank=True)
    cashout_date = models.DateField(null=True)
    enterprise = models.ForeignKey('enterprise.Enterprise', on_delete=models.CASCADE,related_name='all_debtor_transactions')
    branch = models.ForeignKey('enterprise.Branch', on_delete=models.CASCADE, null=True, blank=True)
    # base = models.BooleanField(default=False)
    type = models.CharField(max_length=20,choices=(('base','base'),('return','return'),('payment','payment')),default='base')
    all_sales_transaction = models.ForeignKey(SalesTransaction, on_delete=models.CASCADE,related_name="all_debtor_transaction",null=True,blank=True)
    desc = models.CharField(max_length=255, null=True, blank=True)
    inventory = models.CharField(max_length=20, choices=(('all','all'),('phone','phone')), null=True, blank=True)
    due = models.FloatField(null=True, blank=True, default=0)
    
    def __str__(self):
        return f"Debtor Transaction {self.pk} of {self.debtor.name}"
    
    @transaction.atomic
    def delete(self, *args, **kwargs):
        self.debtor.due = self.debtor.due + self.amount if self.debtor.due is not None else self.amount
        self.debtor.save() 
        super().delete(*args, **kwargs)



class Expenses(models.Model):
    date = models.DateField()
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='all_expenses')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True)
    amount = models.FloatField(null=True,blank=True)
    method = models.CharField(max_length=20,choices=(('cash','Cash'),('card','Card'),('online','Online')),default='cash')
    cheque_number = models.CharField(max_length=255,null=True,blank=True)
    cashout_date = models.DateField(null=True)
    desc = models.CharField(max_length=1000,null=True,blank=True)
    person = models.ForeignKey('enterprise.Person', on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(max_length=50, null=True, blank=True)
    sales_return = models.ForeignKey('SalesReturn', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Expense {self.pk} of {self.enterprise.name}"


class Withdrawal(models.Model):
    date = models.DateField()
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='all_withdrawals')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True)
    amount = models.FloatField(null=True,blank=True)
    # method = models.CharField(max_length=20,choices=(('cash','Cash'),('cheque','Cheque'),('transfer','Transfer')),default='cash')
    # cheque_number = models.CharField(max_length=255,null=True,blank=True)
    # cashout_date = models.DateField(null=True)
    # desc = models.CharField(max_length=1000,null=True,blank=True)
    person = models.ForeignKey('enterprise.Person', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Withdrawal of amount {self.amount} at branch {self.branch.name} of {self.enterprise.name}"

class ClosingCash(models.Model):
    date = models.DateField(auto_now_add=True)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='all_cash_in_hand')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True)
    amount = models.FloatField(null=True,blank=True)

    def __str__(self):
        return f"Closing cash at branch {self.branch.name} of {self.enterprise.name}"