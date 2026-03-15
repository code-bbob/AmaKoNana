import datetime
from django.test import TestCase
from alltransactions.models import Staff, StaffTransactions
from alltransactions.serializers import StaffSerializer, StaffTransactionSerializer
from enterprise.models import Enterprise
from rest_framework.exceptions import ValidationError

class StaffTransactionSerializerTestCase(TestCase):
    def setUp(self):
        # Create an Enterprise instance for testing
        self.enterprise = Enterprise.objects.create(name="Test Enterprise")
        
        # Create two Staff instances linked to the enterprise
        self.staff1 = Staff.objects.create(name="Staff A", due=500, enterprise=self.enterprise)
        self.staff2 = Staff.objects.create(name="Staff B", due=300, enterprise=self.enterprise)
        
        # Common transaction data for tests (using IDs is fine when using the serializer)
        self.transaction_data = {
            'date': datetime.date.today(),
            'staff': self.staff1.id,
            'amount': 200,
            'enterprise': self.enterprise.id,
            'desc': "Initial Transaction"
        }

    def test_create_transaction_updates_due(self):
        """
        Test that when a transaction is created via the serializer,
        the staff's due is updated (reduced by the transaction amount).
        """
        serializer = StaffTransactionSerializer(data=self.transaction_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        transaction = serializer.save()
        
        # After a 200 amount transaction, staff1's due should be: 500 - 200 = 300
        self.staff1.refresh_from_db()
        self.assertEqual(self.staff1.due, 300)

    def test_create_transaction_with_none_due(self):
        """
        Test creating a transaction for a staff whose due is initially None.
        In that case, due should become negative the transaction amount.
        """
        # Create a staff with no initial due value
        staff_no_due = Staff.objects.create(name="Staff C", due=None, enterprise=self.enterprise)
        data = self.transaction_data.copy()
        data['staff'] = staff_no_due.id
        data['amount'] = 150
        data['desc'] = "Transaction for staff with no due"
        
        serializer = StaffTransactionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        transaction = serializer.save()
        
        staff_no_due.refresh_from_db()
        # Expected due becomes: -150
        self.assertEqual(staff_no_due.due, -150)

    def test_update_transaction_same_staff(self):
        """
        Test updating a transaction (changing its amount) when the staff remains the same.
        The staff's due should be adjusted accordingly.
        Calculation:
          - On creation via serializer: due becomes 500 - 200 = 300.
          - On update: new due = 300 - new_amount + old_amount.
            For new_amount=250: 300 - 250 + 200 = 250.
        """
        # Create transaction using the serializer
        create_serializer = StaffTransactionSerializer(data=self.transaction_data)
        self.assertTrue(create_serializer.is_valid(), create_serializer.errors)
        transaction = create_serializer.save()
        
        self.staff1.refresh_from_db()
        self.assertEqual(self.staff1.due, 300)
    
        update_data = {
            'date': self.transaction_data['date'],
            'staff': self.staff1.pk,  # same staff
            'enterprise': self.enterprise.pk,
            'amount': 250,            # new amount
            'desc': "Updated Transaction"
        }
        update_serializer = StaffTransactionSerializer(instance=transaction, data=update_data)
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        update_serializer.save()
    
        self.staff1.refresh_from_db()
        # Expected new due: 300 - 250 + 200 = 250
        self.assertEqual(self.staff1.due, 250)

    def test_update_transaction_change_staff(self):
        """
        Test updating a transaction by changing the associated staff.
        Expected behavior:
          - The original staff's due is increased by the original amount.
          - The new staff's due is decreased by the new amount.
        Calculation:
          - Initially, staff1 due: 500 - 200 = 300.
          - On update:
              old staff (staff1) due becomes: 300 + 200 = 500.
              new staff (staff2) due becomes: 300 - 200 = 100.
        """
        # Create the transaction via the serializer so the create() logic applies.
        create_serializer = StaffTransactionSerializer(data=self.transaction_data)
        self.assertTrue(create_serializer.is_valid(), create_serializer.errors)
        transaction = create_serializer.save()
        
        self.staff1.refresh_from_db()
        self.assertEqual(self.staff1.due, 300)
    
        update_data = {
            'date': self.transaction_data['date'],
            'staff': self.staff2.pk,  # change to staff2
            'enterprise': self.enterprise.pk,
            'amount': 200,
            'desc': "Changed Staff Transaction"
        }
        update_serializer = StaffTransactionSerializer(instance=transaction, data=update_data)
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        update_serializer.save()
    
        self.staff1.refresh_from_db()
        self.staff2.refresh_from_db()
        # staff1 due should be restored to 500 (300 + 200)
        self.assertEqual(self.staff1.due, 500)
        # staff2 due should be reduced from 300 to 100 (300 - 200)
        self.assertEqual(self.staff2.due, 100)

    def test_update_transaction_to_zero_amount(self):
        """
        Test updating a transaction to zero amount.
        Calculation:
          - Initially, staff1 due: 500 - 200 = 300.
          - On update: new due = 300 - 0 + 200 = 500.
        """
        create_serializer = StaffTransactionSerializer(data=self.transaction_data)
        self.assertTrue(create_serializer.is_valid(), create_serializer.errors)
        transaction = create_serializer.save()
    
        self.staff1.refresh_from_db()
        self.assertEqual(self.staff1.due, 300)
    
        update_data = {
            'date': self.transaction_data['date'],
            'staff': self.staff1.pk,
            'enterprise': self.enterprise.pk,
            'amount': 0,
            'desc': "Zero Amount Transaction"
        }
        update_serializer = StaffTransactionSerializer(instance=transaction, data=update_data)
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        update_serializer.save()
    
        self.staff1.refresh_from_db()
        self.assertEqual(self.staff1.due, 500)

    def test_update_transaction_with_invalid_staff(self):
        """
        Test that updating a transaction with a non-existent staff id fails validation.
        """
        create_serializer = StaffTransactionSerializer(data=self.transaction_data)
        self.assertTrue(create_serializer.is_valid(), create_serializer.errors)
        transaction = create_serializer.save()
    
        update_data = {
            'date': self.transaction_data['date'],
            'staff': 9999,  # Assuming this staff ID does not exist
            'enterprise': self.enterprise.pk,
            'amount': 100,
            'desc': "Invalid Staff Update"
        }
        update_serializer = StaffTransactionSerializer(instance=transaction, data=update_data, partial=True)
        self.assertFalse(update_serializer.is_valid())
        self.assertIn('staff', update_serializer.errors)

    def test_delete_transaction(self):
        """
        Test that deleting a transaction restores the staff's due.
        Expected behavior: When a transaction is deleted, the staff's due should be increased by the transaction amount.
        Calculation:
          - Before deletion: staff1 due becomes 500 - 200 = 300.
          - After deletion: staff1 due should become 300 + 200 = 500.
        """
        create_serializer = StaffTransactionSerializer(data=self.transaction_data)
        self.assertTrue(create_serializer.is_valid(), create_serializer.errors)
        transaction = create_serializer.save()
    
        self.staff1.refresh_from_db()
        # At creation, staff1 due should be 300
        initial_due = self.staff1.due  # 300
        transaction.delete()
        self.staff1.refresh_from_db()
        self.assertEqual(self.staff1.due, 500)


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
        
#         # Create two Staff instances linked to the enterprise
#         self.staff1 = Staff.objects.create(name="Staff A", due=500, enterprise=self.enterprise)
#         self.staff2 = Staff.objects.create(name="Staff B", due=300, enterprise=self.enterprise)
        
#         # Common transaction data for tests (using IDs is fine when using the serializer)
#         self.transaction_data = {
#             'date': datetime.date.today(),
#         }