from django.urls import path
from . import views

app_name = 'enterprise'

urlpatterns = [
    path('api/hierarchy/', views.EnterpriseHierarchyAPIView.as_view(), name='hierarchy'),
    path('api/enterprise/<int:enterprise_id>/update-preference/', views.EnterpriseUpdatePreferenceAPIView.as_view(), name='update_preference'),
    # path('employees/',views.EmployeeView.as_view(),name='employees')
    path('branch/',views.BranchView.as_view(),name='branch'),
    path('branch/<int:id>/',views.BranchView.as_view(),name='branch'),
    path('getbranch/',views.UserBranchView.as_view(),name='branch'),
    path('employeebranch/<int:id>/',views.BranchEmployeeView.as_view(),name='branch_employee'),
    path('role/',views.RoleView.as_view(),name='user_role'),
]