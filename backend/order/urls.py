from django.urls import path
from . import views

urlpatterns = [
    path('branch/<int:branch>', views.OrderView.as_view()),
    path('<int:pk>/', views.OrderView.as_view()),

]
