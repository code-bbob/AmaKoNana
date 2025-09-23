import { Route, Routes } from "react-router-dom";
import "./App.css";
import Login from "./pages/login";
import Signup from "./pages/signup";
import { useSelector } from "react-redux";
import ProtectedRoute from "./redux/protectedRoute";
import BranchProtectedRoute from "./redux/BranchProtectedRoute";
import UserRegister from "./pages/userRegister";
import InitialBranchSelection from "./pages/InitialBranchSelection";
import AllLandingPage from "./pages/allLandingPage";
import AllPurchaseTransactions from "./pages/allPurchase";
import AllPurchaseTransactionForm from "./components/allpurchasetransactionform";
import EditAllPurchaseTransactionForm from "./components/editallpurchase";
import AllManufactureTransactions from "./pages/allManufacture";
import AllManufactureTransactionForm from "./components/allmanufacturetransactionform";
import EditAllManufactureForm from "./components/editallmanufacture";
import {AllInventoryPageComponent} from "./pages/allInventoryPage";
import AllBrandProducts from "./pages/allsinglebrand";
import AllSalesTransactions from "./pages/allSales";
import AllSalesTransactionForm from "./components/allsalestransactionform";
import useGlobalKeyPress from "./hooks/globalKeyPress";
import AllVendorPage  from "./pages/allvendors";
import EditAllSalesTransactionForm from "./components/editallsales";
import AllVendorTransactions from "./pages/allvendortransactions";
import AllVendorTransactionForm from "./pages/allvendortransactionform";
import EditAllVendorTransactionForm from "./components/editallvendortransactions";
import AllSalesReport from "./pages/allSalesReport";
import AllPurchaseReport from "./pages/allPurchaseReport";
import AllPurchaseReturns from "./pages/allPurchaseReturn";
import InvoicePage from "./pages/invoicePage";
import EditProductForm from "./components/editProductForm";
import AllSalesReturns from "./pages/allSalesReturn";
import StaffPage from "./pages/staffs";
import AllBranchSelectionPage from "./pages/allBranchSelect";
import StaffTransactions from "./pages/stafftransactions";
import StaffTransactionForm from "./pages/staffTransactionForm";
import StaffTransactionEditForm from "./pages/editStaffTransactionForm";
import AllDebtorsPage from "./pages/allDebtorsPage";
import AllDebtorTransactions from "./pages/allDebtorTransactions";
import DebtorTransactionForm from "./pages/allDebtorTransactionForm";
import EditDebtorTransactionForm from "./pages/editAllDebtors";
import AllVendorStatementPage from "./pages/allVendorStatementPage";
import AllDebtorStatementPage from "./pages/allDebtorStatementPage";
import StaffStatementPage from "./pages/staffStatementPage";
import TransferForm from "./components/transferForm";
import OrderForm from "./components/orderForm";
import EditOrderForm from "./components/editOrderForm";
import OrderDetail from "./components/orderDetail";
import OrdersPage from "./pages/ordersPage";
import ProductIncentivesPage from "./pages/productIncentivesPage";

function App() {
  const { isAuthenticated } = useSelector((state) => state.root);
  useGlobalKeyPress();
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/register" element={<UserRegister />} />

      {/* Protected Routes - Require Authentication */}
      <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
        {/* Branch Selection - Accessible after login */}
        <Route path="/select-branch" element={<InitialBranchSelection />} />
        
        {/* Branch Protected Routes - Require branch selection */}
        <Route element={<BranchProtectedRoute />}>
          {/* Original Landing Page */}
          <Route path="/" element={<AllLandingPage />} />
          {/* Branch-specific Landing Page */}
          <Route path="/branch/:branchId" element={<AllLandingPage />} />

          {/* Main Routes - All use branch from localStorage */}
          <Route path="/purchases/branch/:branchId" element={<AllPurchaseTransactions />} />
          <Route path="/purchases/form/branch/:branchId" element={<AllPurchaseTransactionForm />} />
          <Route path="purchases/branch/:branchId/editform/:purchaseId" element={<EditAllPurchaseTransactionForm />} />

          <Route path="manufacture/branch/:branchId" element={<AllManufactureTransactions />} />
          <Route path="manufacture/form/branch/:branchId" element={<AllManufactureTransactionForm />} />
          <Route path="manufacture/branch/:branchId/editform/:manufactureId" element={<EditAllManufactureForm />} />

          <Route path="purchase-returns/branch/:branchId" element={<AllPurchaseReturns/>}/>

          <Route path="inventory/branch/:branchId" element={<AllInventoryPageComponent />} />
          <Route path="inventory/branch/:branchId/brand/:id" element={<AllBrandProducts />} />
          <Route path="inventory/branch/:branchId/editproduct/:productId" element={<EditProductForm/>} />

          <Route path="sales/branch/:branchId" element={<AllSalesTransactions />} />
          <Route path="sales/form/branch/:branchId" element={<AllSalesTransactionForm />} />
          <Route path="sales/branch/:branchId/editform/:salesId" element={<EditAllSalesTransactionForm />} />

          <Route path="sales-returns/branch/:branchId" element={<AllSalesReturns/>}/>
          <Route path="sales-report/branch/:branchId" element={<AllSalesReport/>}/>
          <Route path="purchase-report/branch/:branchId" element={<AllPurchaseReport/>}/>

          <Route path="staff/branch/:branchId" element={<StaffPage/>}/>

          <Route path="staff/product-incentives/branch/:branchId" element={<ProductIncentivesPage />} />

          <Route path="vendors/branch/:branchId" element={<AllVendorPage />} />
          <Route path="vendors/statement/:vendorId" element={<AllVendorStatementPage />} />
          <Route path="staff/branch/:branchId/statement/:staffId" element={<StaffStatementPage />} />

          <Route path="vendor-transactions/branch/:branchId" element={<AllVendorTransactions />}/>
          <Route path="vendor-transactions/branch/:branchId/form" element={<AllVendorTransactionForm />} />
          <Route path="vendor-transactions/branch/:branchId/editform/:vendorTransactionId" element={<EditAllVendorTransactionForm />} />

          <Route path="staff-transactions/branch/:branchId" element={<StaffTransactions />}/>
          <Route path="staff-transactions/branch/:branchId/form" element={<StaffTransactionForm />}/>
          <Route path="staff-transactions/branch/:branchId/editform/:id" element={<StaffTransactionEditForm />}/> 

          <Route path="debtors/branch/:branchId" element={<AllDebtorsPage />} />
          <Route path="debtor-transactions/branch/:branchId" element={<AllDebtorTransactions />} />
          <Route path="debtor-transactions/branch/:branchId/form" element={<DebtorTransactionForm />} />
          <Route path="debtor-transactions/branch/:branchId/editform/:debtorTransactionId" element={<EditDebtorTransactionForm />} />
          <Route path="debtors/branch/:branchId/statement/:debtorId/" element={<AllDebtorStatementPage />} />

          <Route path="invoice/:transactionId" element={<InvoicePage />} />
          <Route path="transfer/form/branch/:branchId" element={<TransferForm />} />
          
          {/* Orders */}
          <Route path="orders/branch/:branchId" element={<OrdersPage />} />
          <Route path="orders/form/branch/:branchId" element={<OrderForm />} />
          <Route path="orders/branch/:branchId/editform/:orderId" element={<EditOrderForm />} />
          <Route path="orders/branch/:branchId/detail/:orderId" element={<OrderDetail />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
