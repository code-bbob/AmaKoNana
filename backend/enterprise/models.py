from django.db import models
# from repair.models import Repair
# from django.contrib.auth import get_user_model
from django.conf import settings
from datetime import time as _time

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
#
# class Employee(models.Model):
#     user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,primary_key=True)
#     enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE)
#     branch = models.ForeignKey('Branch', on_delete=models.CASCADE, null=True, blank=True)
#
#     ROLE_CHOICES = [
#         ('Admin', 'Admin'),
#         ('Manager', 'Manager'),
#         ('Employee', 'Employee'),
#         # ('Technician', 'Technician'),
#     ]
#     role = models.CharField(max_length=10, choices=ROLE_CHOICES)
#     def __str__(self):
#         return f"{self.user.name} - {self.role} at {self.enterprise.name}"
    



class Branch(models.Model):
    name = models.CharField(max_length=255)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE,related_name='branches')
    def __str__(self):
        return self.name

class Department(models.Model):

    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='departments')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='departments', blank=True, null=True)
    name = models.CharField(max_length=255)
    arrival_time = models.TimeField(default=_time(hour=9, minute=0))
    departure_time = models.TimeField(default=_time(hour=18, minute=0))
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ('enterprise', 'branch', 'name')
    
    def __str__(self) -> str:
        if self.branch:
            return f'{self.name} ({self.branch.name} - {self.enterprise.name})'
        return f'{self.name} ({self.enterprise.name})'



class Employee(models.Model):
    employee_code = models.CharField(max_length=64,blank=True)
    name = models.CharField(max_length=255)
    avatar = models.ImageField(upload_to='employee_avatars/', blank=True, null=True)
    enterprise = models.ForeignKey(
        Enterprise,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='employees',
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='employees',
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='employees',
    )
    arrival_time = models.TimeField(default=_time(hour=9, minute=0))
    departure_time = models.TimeField(default=_time(hour=18, minute=0))
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='employee',
    )
    email = models.EmailField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    role = models.CharField(choices=[('Admin', 'Admin'),('Manager', 'Manager'), ('Employee', 'Employee')], default='Employee', max_length=20)
    is_active = models.BooleanField(default=True)
    due = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name', 'employee_code']
        constraints = [
            models.UniqueConstraint(
                fields=['enterprise', 'employee_code'],
                name='unique_employee_code_per_enterprise',
            )
        ]

    def __str__(self) -> str:
        return f'{self.name} ({self.employee_code})'

