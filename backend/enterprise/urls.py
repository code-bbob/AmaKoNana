from django.urls import path
from . import views

urlpatterns = [
    # path('employees/',views.EmployeeView.as_view(),name='employees')
    path('branch/',views.BranchView.as_view(),name='branch'),
    path('branch/<int:id>/',views.BranchView.as_view(),name='branch'),
    path('getbranch/',views.UserBranchView.as_view(),name='branch'),
    path('employeebranch/<int:id>/',views.BranchEmployeeView.as_view(),name='branch_employee'),
    path('role/',views.RoleView.as_view(),name='user_role'),
   
]