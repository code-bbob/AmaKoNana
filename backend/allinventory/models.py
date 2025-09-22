from django.db import models
from django.utils import timezone
import random

# Create your models here.

class Brand(models.Model):
    name = models.CharField(max_length=255)
    stock = models.FloatField(null=True,blank=True,default=0)
    count = models.IntegerField(null=True,blank=True,default=0)
    enterprise = models.ForeignKey('enterprise.Enterprise', on_delete=models.CASCADE,related_name='all_brand')
    branch = models.ForeignKey('enterprise.Branch', on_delete=models.CASCADE,related_name='all_brand', null=True, blank=True)
    
    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=255)
    uid = models.CharField(max_length = 12,blank=True) 
    # quantity = models.IntegerField(null=True,blank=True)
    cost_price = models.FloatField(null=True,blank=True, default=0)
    selling_price = models.FloatField(null=True,blank=True, default=0)
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE)
    stock = models.IntegerField(null=True,blank=True,default=0)
    count = models.IntegerField(null=True,blank=True,default=0)
    print_pattern = models.ImageField(upload_to='product_patterns/', null=True, blank=True)
    # vendor = models.ForeignKey('alltransactions.Vendor', on_delete=models.CASCADE,related_name='all_product')
    vendor = models.ManyToManyField('alltransactions.Vendor', related_name='all_product', blank=True)
    enterprise = models.ForeignKey('enterprise.Enterprise', on_delete=models.CASCADE,related_name='all_product')
    branch = models.ForeignKey('enterprise.Branch', on_delete=models.CASCADE,related_name='all_product', null=True, blank=True)
    def __str__(self):
        return self.name    
    
    def save(self,*args, **kwargs):

        if self.pk is None:
            if self.uid is None or self.uid == '':
                self.uid = self.generate_unique_uid()
        super().save(*args, **kwargs)
    

    def generate_unique_uid(self):
            ###print("Generating uid")
            while True:
                uid = ''.join([str(random.randint(0, 9)) for _ in range(12)])
                if uid.startswith('0') or uid.startswith('1'):
                    continue
                if not Product.objects.filter(uid=uid).exists():
                    return uid



class Manufacture(models.Model):
    date = models.DateField(default=timezone.now().date(),null=True,blank=True)
    enterprise = models.ForeignKey('enterprise.Enterprise', on_delete=models.CASCADE, related_name='manufactures')
    branch = models.ForeignKey('enterprise.Branch', on_delete=models.CASCADE, related_name='manufactures', null=True, blank=True)

class ManufactureItem(models.Model):
    manufacture = models.ForeignKey(Manufacture, on_delete=models.CASCADE, related_name='manufacture_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='manufacture_items')
    quantity = models.IntegerField(null=True, blank=True, default=0)
    unit_price = models.FloatField(null=True, blank=True, default=0)


    # def delete(self, *args, **kwargs):
    #     product = self.product
    #     product.refresh_from_db()
    #     product.count -= self.quantity
    #     product.stock -= self.quantity * product.selling_price
    #     product.save()
    #     brand = product.brand
    #     brand.refresh_from_db()
    #     brand.count -= self.quantity * product.selling_price
    #     brand.save()
    #     super().delete(*args, **kwargs)


class IncentiveProduct(models.Model):
    name = models.CharField(max_length=255)
    rate = models.FloatField(null=True, blank=True, default=0)
    enterprise = models.ForeignKey('enterprise.Enterprise', on_delete=models.CASCADE,related_name='incentive_products')
    branch = models.ForeignKey('enterprise.Branch', on_delete=models.CASCADE,related_name='incentive_products', null=True, blank=True)

    def __str__(self):
        return self.name