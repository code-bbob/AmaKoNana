from django.urls import path
from . import views

urlpatterns = [
    path('purchasetransaction/', views.PurchaseTransactionView.as_view(), name='purchase'),
    path('purchasetransaction/branch/<int:branch>/', views.PurchaseTransactionView.as_view(), name='purchase'),
    path('purchasetransaction/<int:pk>/', views.PurchaseTransactionView.as_view(), name='purchase'),
    path('vendor/', views.VendorView.as_view(), name='vendor'),
    path('vendor/branch/<int:branch>/', views.VendorView.as_view(), name='vendor'),
    path('vendor/branch/<int:branch>/<int:pk>/', views.VendorView.as_view(), name='vendor_delete'),
    path('vendor/<int:pk>/', views.VendorView.as_view(), name='vendor_detail'),
    path('salestransaction/', views.SalesTransactionView.as_view(), name='sales'),
    path('salestransaction/branch/<int:branch>/', views.SalesTransactionView.as_view(), name='sales'),
    path('salestransaction/<int:pk>/', views.SalesTransactionView.as_view(), name='sales'),
    path('vendortransaction/', views.VendorTransactionView.as_view(), name='vendortransactions'),
    path('vendortransaction/branch/<int:branch>/', views.VendorTransactionView.as_view(), name='vendor'),
    path('vendortransaction/<int:pk>/', views.VendorTransactionView.as_view(), name='vendortransactions'),
    path('stats/', views.StatsView.as_view(), name='stat'),
    path('stats/branch/<int:branch>/', views.StatsView.as_view(), name='stat'),

    path('vendor/statement/<int:vendorId>/',views.VendorStatementView.as_view(), name = 'vendorstatement'),

    path('purchase-return/',views.PurchaseReturnView.as_view(), name='purchasereturn'),
    path('purchase-return/branch/<int:branch>/',views.PurchaseReturnView.as_view(), name='purchasereturn'),
    path('purchase-return/<int:pk>/',views.PurchaseReturnView.as_view(), name='purchasereturn'),
    path('sales-return/',views.SalesReturnView.as_view(), name='purchasereturn'),
    path('sales-return/branch/<int:branch>/',views.SalesReturnView.as_view(), name='purchasereturn'),
    path('sales-return/<int:pk>/',views.SalesReturnView.as_view(), name='purchasereturn'),
    path('sales-report/',views.SalesReportView.as_view(), name='salesreport'),
    path('sales-report/branch/<int:branch>/',views.SalesReportView.as_view(), name='salesreport'),
    path('purchase-report/',views.PurchaseReportView.as_view(), name='purchasereport'),
    path('purchase-report/branch/<int:branch>/',views.PurchaseReportView.as_view(), name='purchasereport'),
    path('next-bill-no/',views.NextBillNo.as_view(), name='nextbillno'),
    path('stafftransaction/',views.StaffTransactionView.as_view(), name='stafftransaction'),
    path('stafftransaction/branch/<int:branch>/',views.StaffTransactionView.as_view(), name='stafftransaction'),
    path('stafftransaction/staff/<int:staff_pk>/',views.StaffTransactionView.as_view(), name='stafftransaction'),
    path('stafftransaction/<int:pk>/',views.StaffTransactionView.as_view(), name='stafftransaction'),

    path('staff/',views.StaffView.as_view(), name='staff'),
    path('staff/branch/<int:branchId>/',views.StaffView.as_view(), name='staff'),
    path('customer/<int:pk>/',views.CustomerView.as_view(), name='customertotal'),
    path('customer/',views.CustomerView.as_view(), name='customertotal'),
    path('debtors/', views.DebtorsView.as_view(), name='debtors'),
    path('debtors/branch/<int:branchId>/', views.DebtorsView.as_view(), name='debtors_branch'),
    path('debtors/<int:pk>/', views.DebtorsView.as_view(), name='debtor_detail'),
    path('debtortransaction/', views.DebtorTransactionView.as_view(), name='debtortransaction'),
    path('debtortransaction/branch/<int:branch>/', views.DebtorTransactionView.as_view(), name='debtortransaction'),
    path('debtortransaction/<int:pk>/', views.DebtorTransactionView.as_view(), name='debtortransaction'),

    path('debtor/statement/<int:debtorId>/',views.DebtorStatementView.as_view(), name = 'debtorstatement'),

    # Staff Statement
    path('staff/statement/<int:staffId>/', views.StaffStatementView.as_view(), name='staffstatement'),

    path('product-transfer/', views.ProductTransferView.as_view(), name='product_transfer')


]
