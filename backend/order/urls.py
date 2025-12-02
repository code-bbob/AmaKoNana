from django.urls import path
from . import views

urlpatterns = [
    path('branch/<int:branch>/', views.OrderView.as_view()),
    path('<int:pk>/', views.OrderView.as_view()),
    path('overview/branch/<int:branch>/', views.OrderOverviewView.as_view()),
    path('report/branch/<int:branch>/', views.OrderReportVie.as_view()),

]
