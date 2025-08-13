from django.urls import path
from . import views

urlpatterns = [
    path('product/', views.ProductView.as_view()),
    path('product/branch/<int:branch>/', views.ProductView.as_view()),
    path('product/branch/<int:selfbranch>/brand/<int:brand>/merge/<int:mergebranch>/', views.MergeProductBrandView.as_view()),
    path('deleteproduct/<int:pk>/', views.ProductView.as_view()),
    path('product/<int:pk>/', views.ProductView.as_view()),
    path('brand/branch/<int:selfbranch>/merge/<int:mergebranch>/', views.MergeBrandView.as_view()),
    path('brand/', views.BrandView.as_view()),
    path('brand/branch/<int:branch>/', views.BrandView.as_view()),
    path('brand/<int:pk>/', views.BrandView.as_view()),
    path('barcode/<int:pk>/', views.generate_barcode),
    path('manufacture/', views.ManufactureView.as_view()),   
]
