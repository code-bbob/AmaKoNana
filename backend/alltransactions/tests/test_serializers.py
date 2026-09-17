import datetime
from django.test import TestCase
from alltransactions.models import EmployeeTransactions
from alltransactions.serializers import EmployeeTransactionSerializer
from allinventory.models import IncentiveProduct
from enterprise.models import Employee, Enterprise
from rest_framework.exceptions import ValidationError

class EmployeeTransactionSerializerTestCase(TestCase):
    def setUp(self):
        # Create an Enterprise instance for testing
        self.enterprise = Enterprise.objects.create(name="Test Enterprise")
        
        # Create two Employee instances linked to the enterprise
        self.employee1 = Employee.objects.create(name="Employee A", due=500, enterprise=self.enterprise)
        self.employee2 = Employee.objects.create(name="Employee B", due=300, enterprise=self.enterprise)
        
        # Common transaction data for tests (using IDs is fine when using the serializer)
        self.transaction_data = {
            'date': datetime.date.today(),
            'employee': self.employee1.id,
            'amount': 200,
            'enterprise': self.enterprise.id,
            'desc': "Initial Transaction"
        }

    def test_create_transaction_updates_due(self):
        """
        Test that when a transaction is created via the serializer,
        the employee's due is updated (reduced by the transaction amount).
        """
        serializer = EmployeeTransactionSerializer(data=self.transaction_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        transaction = serializer.save()
        
        # After a 200 amount transaction, employee1's due should be: 500 - 200 = 300
        self.employee1.refresh_from_db()
        self.assertEqual(self.employee1.due, 300)

    def test_create_transaction_with_none_due(self):
        """
        Test creating a transaction for a employee whose due is initially None.
        In that case, due should become negative the transaction amount.
        """
        # Create a employee with no initial due value
        employee_no_due = Employee.objects.create(name="Employee C", due=None, enterprise=self.enterprise)
        data = self.transaction_data.copy()
        data['employee'] = employee_no_due.id
        data['amount'] = 150
        data['desc'] = "Transaction for employee with no due"
        
        serializer = EmployeeTransactionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        transaction = serializer.save()
        
        employee_no_due.refresh_from_db()
        # Expected due becomes: -150
        self.assertEqual(employee_no_due.due, -150)

    def test_update_transaction_same_employee(self):
        """
        Test updating a transaction (changing its amount) when the employee remains the same.
        The employee's due should be adjusted accordingly.
        Calculation:
          - On creation via serializer: due becomes 500 - 200 = 300.
          - On update: new due = 300 - new_amount + old_amount.
            For new_amount=250: 300 - 250 + 200 = 250.
        """
        # Create transaction using the serializer
        create_serializer = EmployeeTransactionSerializer(data=self.transaction_data)
        self.assertTrue(create_serializer.is_valid(), create_serializer.errors)
        transaction = create_serializer.save()
        
        self.employee1.refresh_from_db()
        self.assertEqual(self.employee1.due, 300)
    
        update_data = {
            'date': self.transaction_data['date'],
            'employee': self.employee1.pk,  # same employee
            'enterprise': self.enterprise.pk,
            'amount': 250,            # new amount
            'desc': "Updated Transaction"
        }
        update_serializer = EmployeeTransactionSerializer(instance=transaction, data=update_data)
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        update_serializer.save()
    
        self.employee1.refresh_from_db()
        # Expected new due: 300 - 250 + 200 = 250
        self.assertEqual(self.employee1.due, 250)

    def test_update_transaction_change_employee(self):
        """
        Test updating a transaction by changing the associated employee.
        Expected behavior:
          - The original employee's due is increased by the original amount.
          - The new employee's due is decreased by the new amount.
        Calculation:
          - Initially, employee1 due: 500 - 200 = 300.
          - On update:
              old employee (employee1) due becomes: 300 + 200 = 500.
              new employee (employee2) due becomes: 300 - 200 = 100.
        """
        # Create the transaction via the serializer so the create() logic applies.
        create_serializer = EmployeeTransactionSerializer(data=self.transaction_data)
        self.assertTrue(create_serializer.is_valid(), create_serializer.errors)
        transaction = create_serializer.save()
        
        self.employee1.refresh_from_db()
        self.assertEqual(self.employee1.due, 300)
    
        update_data = {
            'date': self.transaction_data['date'],
            'employee': self.employee2.pk,  # change to employee2
            'enterprise': self.enterprise.pk,
            'amount': 200,
            'desc': "Changed Employee Transaction"
        }
        update_serializer = EmployeeTransactionSerializer(instance=transaction, data=update_data)
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        update_serializer.save()
    
        self.employee1.refresh_from_db()
        self.employee2.refresh_from_db()
        # employee1 due should be restored to 500 (300 + 200)
        self.assertEqual(self.employee1.due, 500)
        # employee2 due should be reduced from 300 to 100 (300 - 200)
        self.assertEqual(self.employee2.due, 100)

    def test_update_transaction_to_zero_amount(self):
        """
        Test updating a transaction to zero amount.
        Calculation:
          - Initially, employee1 due: 500 - 200 = 300.
          - On update: new due = 300 - 0 + 200 = 500.
        """
        create_serializer = EmployeeTransactionSerializer(data=self.transaction_data)
        self.assertTrue(create_serializer.is_valid(), create_serializer.errors)
        transaction = create_serializer.save()
    
        self.employee1.refresh_from_db()
        self.assertEqual(self.employee1.due, 300)
    
        update_data = {
            'date': self.transaction_data['date'],
            'employee': self.employee1.pk,
            'enterprise': self.enterprise.pk,
            'amount': 0,
            'desc': "Zero Amount Transaction"
        }
        update_serializer = EmployeeTransactionSerializer(instance=transaction, data=update_data)
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        update_serializer.save()
    
        self.employee1.refresh_from_db()
        self.assertEqual(self.employee1.due, 500)

    def test_update_transaction_with_invalid_employee(self):
        """
        Test that updating a transaction with a non-existent employee id fails validation.
        """
        create_serializer = EmployeeTransactionSerializer(data=self.transaction_data)
        self.assertTrue(create_serializer.is_valid(), create_serializer.errors)
        transaction = create_serializer.save()
    
        update_data = {
            'date': self.transaction_data['date'],
            'employee': 9999,  # Assuming this employee ID does not exist
            'enterprise': self.enterprise.pk,
            'amount': 100,
            'desc': "Invalid Employee Update"
        }
        update_serializer = EmployeeTransactionSerializer(instance=transaction, data=update_data, partial=True)
        self.assertFalse(update_serializer.is_valid())
        self.assertIn('employee', update_serializer.errors)

    def test_delete_transaction(self):
        """
        Test that deleting a transaction restores the employee's due.
        Expected behavior: When a transaction is deleted, the employee's due should be increased by the transaction amount.
        Calculation:
          - Before deletion: employee1 due becomes 500 - 200 = 300.
          - After deletion: employee1 due should become 300 + 200 = 500.
        """
        create_serializer = EmployeeTransactionSerializer(data=self.transaction_data)
        self.assertTrue(create_serializer.is_valid(), create_serializer.errors)
        transaction = create_serializer.save()
    
        self.employee1.refresh_from_db()
        # At creation, employee1 due should be 300
        initial_due = self.employee1.due  # 300
        transaction.delete()
        self.employee1.refresh_from_db()
        self.assertEqual(self.employee1.due, 500)


class EmployeeTransactionSetBonusTestCase(TestCase):
    def setUp(self):
        self.enterprise = Enterprise.objects.create(name="Test Enterprise")
        self.employee = Employee.objects.create(name="Emp A", due=0, enterprise=self.enterprise, employee_code="E001")
        self.set_product = IncentiveProduct.objects.create(
            name="Product A", rate=100, is_set=True, set_bonus=50, enterprise=self.enterprise
        )
        self.other_set = IncentiveProduct.objects.create(
            name="Product C", rate=80, is_set=True, set_bonus=20, enterprise=self.enterprise
        )
        self.normal_product = IncentiveProduct.objects.create(
            name="Product B", rate=100, is_set=False, enterprise=self.enterprise
        )

    def _incentive_data(self, details, amount):
        return {
            'date': datetime.date.today(),
            'employee': self.employee.pk,
            'amount': amount,
            'enterprise': self.enterprise.pk,
            'employee_type': 'incentive',
            'transaction_type': 'Salary Credited',
            'employee_transaction_details': details,
        }

    def test_create_set_product_transaction_posts_bonus(self):
        data = self._incentive_data([
            {'bill_no': '123', 'product': self.set_product.pk, 'quantity': 3, 'rate': 100, 'total': 300},
        ], 300)
        serializer = EmployeeTransactionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        tx = serializer.save()

        bonuses = tx.bonus_transactions.all()
        self.assertEqual(bonuses.count(), 1)
        bonus = bonuses.first()
        self.assertEqual(bonus.amount, 150)  # 50 * 3
        self.assertIn("123", bonus.desc)
        self.assertEqual(bonus.transaction_type, "Salary Credited")

        self.employee.refresh_from_db()
        self.assertEqual(self.employee.due, 300 + 150)

    def test_no_bonus_for_non_set_products(self):
        data = self._incentive_data([
            {'bill_no': '456', 'product': self.normal_product.pk, 'quantity': 1, 'rate': 100, 'total': 100},
        ], 100)
        serializer = EmployeeTransactionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        tx = serializer.save()

        self.assertEqual(tx.bonus_transactions.count(), 0)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.due, 100)

    def test_multiple_sets_aggregate_into_single_bonus(self):
        data = self._incentive_data([
            {'bill_no': '111', 'product': self.set_product.pk, 'quantity': 2, 'rate': 100, 'total': 200},
            {'bill_no': '222', 'product': self.other_set.pk, 'quantity': 5, 'rate': 80, 'total': 400},
        ], 600)
        serializer = EmployeeTransactionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        tx = serializer.save()

        bonuses = tx.bonus_transactions.all()
        self.assertEqual(bonuses.count(), 1)
        self.assertEqual(bonuses.first().amount, 50 * 2 + 20 * 5)  # 200
        self.assertIn("111", bonuses.first().desc)
        self.assertIn("222", bonuses.first().desc)

        self.employee.refresh_from_db()
        self.assertEqual(self.employee.due, 600 + 200)

    def test_delete_parent_reverses_bonus_flow(self):
        data = self._incentive_data([
            {'bill_no': '123', 'product': self.set_product.pk, 'quantity': 3, 'rate': 100, 'total': 300},
        ], 300)
        serializer = EmployeeTransactionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        tx = serializer.save()
        tx_id = tx.pk

        self.employee.refresh_from_db()
        self.assertEqual(self.employee.due, 450)
        self.assertEqual(EmployeeTransactions.objects.filter(bonus_for_id=tx_id).count(), 1)

        tx.delete()
        self.assertEqual(EmployeeTransactions.objects.filter(bonus_for_id=tx_id).count(), 0)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.due, 0)

    def test_update_regenerates_bonus_from_new_details(self):
        data = self._incentive_data([
            {'bill_no': '123', 'product': self.set_product.pk, 'quantity': 3, 'rate': 100, 'total': 300},
        ], 300)
        serializer = EmployeeTransactionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        tx = serializer.save()
        self.assertEqual(tx.bonus_transactions.count(), 1)

        update_data = self._incentive_data([
            {'bill_no': '999', 'product': self.set_product.pk, 'quantity': 1, 'rate': 100, 'total': 100},
        ], 100)
        update_serializer = EmployeeTransactionSerializer(instance=tx, data=update_data)
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        tx = update_serializer.save()

        bonuses = tx.bonus_transactions.all()
        self.assertEqual(bonuses.count(), 1)
        self.assertEqual(bonuses.first().amount, 50)
        self.assertIn("999", bonuses.first().desc)
        self.assertNotIn("123", bonuses.first().desc)

        self.employee.refresh_from_db()
        self.assertEqual(self.employee.due, 100 + 50)

    def test_update_change_employee_with_bonus_migrates_bonus(self):
        employee2 = Employee.objects.create(name="Emp B", due=100, enterprise=self.enterprise, employee_code="E002")
        data = self._incentive_data([
            {'bill_no': '111', 'product': self.set_product.pk, 'quantity': 3, 'rate': 100, 'total': 300},
        ], 300)
        serializer = EmployeeTransactionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        tx = serializer.save()

        self.assertEqual(tx.bonus_transactions.count(), 1)
        self.assertEqual(tx.bonus_transactions.first().amount, 150)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.due, 450)

        update_data = self._incentive_data([
            {'bill_no': '999', 'product': self.set_product.pk, 'quantity': 3, 'rate': 100, 'total': 300},
        ], 300)
        update_data['employee'] = employee2.pk
        update_serializer = EmployeeTransactionSerializer(instance=tx, data=update_data)
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        tx = update_serializer.save()

        self.assertEqual(tx.bonus_transactions.count(), 1)
        self.assertEqual(tx.bonus_transactions.first().amount, 150)
        self.assertEqual(tx.bonus_transactions.first().employee_id, employee2.pk)

        self.employee.refresh_from_db()
        employee2.refresh_from_db()
        self.assertEqual(self.employee.due, 0)
        self.assertEqual(employee2.due, 100 + 300 + 150)


class NCMSerializerTestCase(TestCase):
    """Tests for NCM and NCMTransaction serializer behavior."""

    def setUp(self):
        self.enterprise = Enterprise.objects.create(name="Test Ent")
        # create an NCM record for enterprise
        from alltransactions.models import NCM
        self.ncm = NCM.objects.create(enterprise=self.enterprise, due=1000)

    def test_ncm_transaction_creation_updates_due(self):
        from alltransactions.serializers import NCMTransactionSerializer

        data = {
            'date': datetime.date.today(),
            'amount': 200,
            'enterprise': self.enterprise.id,
            'ncm': self.ncm.id,
        }
        serializer = NCMTransactionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        tx = serializer.save()
        self.ncm.refresh_from_db()
        # due should decrease by 200
        self.assertEqual(self.ncm.due, 800)

    def test_sales_transaction_creates_matching_ncm_tx(self):
        # ensure SalesTransactionSerializer links ncm correctly
        from alltransactions.serializers import SalesTransactionSerializer
        from alltransactions.models import SalesTransaction, NCMTransaction

        # create transaction with is_ncm flag
        payload = {
            'enterprise': self.enterprise.id,
            'date': datetime.date.today(),
            'bill_no': 123,
            'total_amount': 0,
            'sales': [],
            'method': 'cash',
            'is_ncm': True,
            'delivery_charge': 50,
            'cod_amount': 0,
        }
        serializer = SalesTransactionSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        st = serializer.save()
        # a corresponding ncm transaction should exist
        ncm_ts = NCMTransaction.objects.filter(all_sales_transaction=st)
        self.assertTrue(ncm_ts.exists())
        self.ncm.refresh_from_db()
        # due should have been reduced by delivery charge
        self.assertEqual(self.ncm.due, 950)

# class PurcahseTransactionSerializerTestCase(TestCase):
#     def setUp(self):
#         # Create an Enterprise instance for testing
#         self.enterprise = Enterprise.objects.create(name="Test Enterprise")
        
#         # Create two Employee instances linked to the enterprise
#         self.employee1 = Employee.objects.create(name="Employee A", due=500, enterprise=self.enterprise)
#         self.employee2 = Employee.objects.create(name="Employee B", due=300, enterprise=self.enterprise)
        
#         # Common transaction data for tests (using IDs is fine when using the serializer)
#         self.transaction_data = {
#             'date': datetime.date.today(),
#         }