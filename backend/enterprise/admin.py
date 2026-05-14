from django.contrib import admin
from .models import Enterprise,Employee, Branch
# Register your models here.

# class EmployeeInline(admin.TabularInline):
#     model = Employee
#     extra = 0

# class EnterpriseAdmin(admin.ModelAdmin):
#     inlines = [EmployeeInline]

#     def delete_model(self, request, obj):
#         # Custom delete logic if needed
#         obj.delete()


# admin.site.register(Enterprise,EnterpriseAdmin)
# admin.site.register(Employee)

admin.site.register(Enterprise)
admin.site.register(Employee)
admin.site.register(Branch)