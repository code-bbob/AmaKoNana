import { Route, Routes } from "react-router-dom";
import "./App.css";
import Login from "./pages/login";
import Signup from "./pages/signup";
import { useSelector } from "react-redux";
import ProtectedRoute from "./redux/protectedRoute";
import BranchProtectedRoute from "./redux/BranchProtectedRoute";
import UserRegister from "./pages/userRegister";
import { InventoryPageComponent } from "./pages/inventory-page";
import BrandPhones from "./pages/singleBrand";
import PurchaseTransactions from "./pages/purchase";
import PurchaseTransactionForm from "./components/purchase-transaction-form";
import SinglePhone from "./pages/singlePhone";
import SalesTransactionForm from "./components/sales-transaction-form";
import SalesTransactions from "./pages/sales";
import SchemePageComponent from "./pages/schemes";
import BrandSchemePage from "./pages/brandscheme";
import SchemeForm from "./components/scheme-form";
import SingleScheme from "./pages/singlescheme";
import PPPageComponent from "./pages/priceprotection";
import BrandPPPage from "./pages/brandpp";
import SinglePP from "./pages/singlepp";
import PriceProtectionForm from "./components/price-protection-form";
import LandingPage from "./components/landing-page";
import InitialBranchSelection from "./pages/InitialBranchSelection";
import { VendorPage } from "./pages/vendors";
import VendorBrand from "./pages/vendorsbrand";
import EditPurchaseTransactionForm from "./components/editpurchase";
import EditSalesTransactionForm from "./components/editsales";
import EditSchemeForm from "./components/editschemes";
import EditPriceProtectionForm from "./components/editpp";
import VendorForm from "./components/postVendors";
import VendorTransactions from "./pages/vendortransactions";
import VendorTransactionForm from "./pages/vendortransactionform";
import EditVendorTransactionForm from "./components/editvendortransaction";
import AllLandingPage from "./pages/allLandingPage";
import AllPurchaseTransactions from "./pages/allPurchase";
import AllPurchaseTransactionForm from "./components/allpurchasetransactionform";
import EditAllPurchaseTransactionForm from "./components/editallpurchase";
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
import PurchaseReturns from "./pages/purchaseReturn";
import SalesReturns from "./pages/salesReturns";
import SalesReport from "./pages/salesReport";
import AllSalesReport from "./pages/allSalesReport";
import AllPurchaseReturns from "./pages/allPurchaseReturn";
import InvoicePage from "./pages/invoicePage";
import EditProductForm from "./components/editProductForm";
import AllSalesReturns from "./pages/allSalesReturn";
import StaffPage from "./pages/staffs";
import BranchSelectionPage from "./pages/branchSelect";
import AllBranchSelectionPage from "./pages/allBranchSelect";
import StaffTransactions from "./pages/stafftransactions";
import StaffTransactionForm from "./pages/staffTransactionForm";
import StaffTransactionEditForm from "./pages/editStaffTransactionForm";
import AllDebtorsPage from "./pages/allDebtorsPage";
import AllDebtorTransactions from "./pages/allDebtorTransactions";
import DebtorTransactionForm from "./pages/allDebtorTransactionForm";
import EditDebtorTransactionForm from "./pages/editAllDebtors";
import EMIDebtorsPage from "./pages/emiDebtors";
import EMIDebtorTransactions from "./pages/emiDebtorsTransaction";
import EMIDebtorTransactionForm from "./pages/emiDebtorsTransactionForm";
import EditEMIDebtorTransaction from "./pages/editEmiDebtorTransactions";
import AllVendorStatementPage from "./pages/allVendorStatementPage";
import AllDebtorStatementPage from "./pages/allDebtorStatementPage";
import EditPhoneForm from "./components/editPhoneForm";

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

          <Route path="purchase-returns/branch/:branchId" element={<AllPurchaseReturns/>}/>

          <Route path="inventory/branch/:branchId" element={<AllInventoryPageComponent />} />
          <Route path="inventory/branch/:branchId/brand/:id" element={<AllBrandProducts />} />
          <Route path="inventory/branch/:branchId/editproduct/:productId" element={<EditProductForm/>} />

          <Route path="sales/branch/:branchId" element={<AllSalesTransactions />} />
          <Route path="sales/form/branch/:branchId" element={<AllSalesTransactionForm />} />
          <Route path="sales/branch/:branchId/editform/:salesId" element={<EditAllSalesTransactionForm />} />

          <Route path="sales-returns/branch/:branchId" element={<AllSalesReturns/>}/>
          <Route path="sales-report/branch/:branchId" element={<AllSalesReport/>}/>

          <Route path="staff/branch/:branchId" element={<StaffPage/>}/>

          <Route path="vendors/branch/:branchId" element={<AllVendorPage />} />
          <Route path="vendors/statement/:vendorId" element={<AllVendorStatementPage />} />

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
          <Route path="debtors/statement/:debtorId" element={<AllDebtorStatementPage />} />

          <Route path="invoice/:transactionId" element={<InvoicePage />} />

          {/* Mobile Section */}
          <Route path="/mobile" >
            <Route path="" element={<LandingPage />} />
            <Route path="inventory/branch/:branchId" element={<InventoryPageComponent />} />
            <Route path="inventory/branch/:branchId/brand/:id" element={<BrandPhones />} />
            <Route path="phone/:id" element={<SinglePhone />} />
            <Route path="inventory/edit-phone/:phoneId" element={<EditPhoneForm />} />

            {/* Purchases Section */}
            <Route path="purchases/branch/:branchId" element={<PurchaseTransactions />} />
            <Route path="purchases/form/branch/:branchId" element={<PurchaseTransactionForm />} />
            <Route path="purchases/branch/:branchId/editform/:purchaseId" element={<EditPurchaseTransactionForm />} />

            <Route path="purchase-returns/branch/:branchId" element={<PurchaseReturns />} />

            {/* Sales Section */}
            <Route path="sales/branch/:branchId" element={<SalesTransactions />} />
            <Route path="sales/form/branch/:branchId" element={<SalesTransactionForm />} />
            <Route path="sales/branch/:branchId/editform/:salesId" element={<EditSalesTransactionForm />} />

            <Route path="sales-returns/branch/:branchId" element={<SalesReturns />} />

            {/* Schemes Section */}
            <Route path="schemes/branch/:branchId" element={<SchemePageComponent />} />
            <Route path="schemes/branch/:branchId/brand/:id" element={<BrandSchemePage />} />
            <Route path="schemes/branch/:branchId/new" element={<SchemeForm />} />
            <Route path="schemes/:id" element={<SingleScheme />} />
            <Route path="schemes/branch/:branchId/editform/:schemeId" element={<EditSchemeForm />} />

            {/* Price Protection Section */}
            <Route path="price-protection/branch/:branchId" element={<PPPageComponent />} />
            <Route path="price-protection/branch/:branchId/brand/:id" element={<BrandPPPage />} />
            <Route path="price-protection/:id" element={<SinglePP />} />
            <Route path="price-protection/branch/:branchId/new" element={<PriceProtectionForm />} />
            <Route path="price-protection/editform/:priceProtectionId" element={<EditPriceProtectionForm />} />

            {/* Vendors Section */}
            <Route path="vendors/branch/:branchId" element={<VendorPage />} />
            <Route path="vendors/branch/:branchId/brand/:id" element={<VendorBrand />} />

            <Route path="vendor-transactions/branch/:branchId" element={<VendorTransactions />} />
            <Route path="vendor-transactions/branch/:branchId/form" element={<VendorTransactionForm />} />
            <Route path="vendor-transactions/branch/:branchId/editform/:vendorTransactionId" element={<EditVendorTransactionForm />} />

            <Route path="emi/branch/:branchId" element={<EMIDebtorsPage />} />

            <Route path="emi-transactions/branch/:branchId" element={<EMIDebtorTransactions/>}/>
            <Route path="emi-transactions/branch/:branchId/form" element={<EMIDebtorTransactionForm />} />
            <Route path="emi-transactions/branch/:branchId/editform/:transactionId" element={<EditEMIDebtorTransaction />} />

            <Route path="sales-report/branch/:branchId" element={<SalesReport/>}/>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
