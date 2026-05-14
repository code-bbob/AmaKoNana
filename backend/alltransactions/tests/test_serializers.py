import datetime
from django.test import TestCase
from alltransactions.models import Employee, EmployeeTransactions
from alltransactions.serializers import EmployeeSerializer, EmployeeTransactionSerializer
from enterprise.models import Enterprise
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