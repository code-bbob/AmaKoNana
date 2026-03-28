from django.db import models
# from repair.models import Repair
# from django.contrib.auth import get_user_model
from django.conf import settings

# Create your models here.

# user=get_user_model()

class Enterprise(models.Model):
    name = models.CharField(max_length=255)
    def __str__(self):
        return self.name


# # class Outside(models.Model):
# #     name = models.CharField(max_length=30)
# #     enterprise = models.ForeignKey(Enterprise,on_delete=models.CASCADE, related_name="outsides",null=True)
# #     due = models.IntegerField()
# #     def __str__(self):
# #         return self.name    

class Person(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,primary_key=True)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE)
    branch = models.ForeignKey('Branch', on_delete=models.CASCADE, null=True, blank=True)

    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Manager', 'Manager'),
        ('Staff', 'Staff'),
        # ('Technician', 'Technician'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    def __str__(self):
        return f"{self.user.name} - {self.role} at {self.enterprise.name}"
    



class Branch(models.Model):
    name = models.CharField(max_length=255)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='branch')
    def __str__(self):
        return self.name
