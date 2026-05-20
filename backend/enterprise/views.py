from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.status import HTTP_403_FORBIDDEN, HTTP_400_BAD_REQUEST
from django.utils.dateparse import parse_date
from datetime import datetime, date
from .serializers import BranchSerializer, EnterpriseHierarchySerializer
from .models import Branch, Enterprise
from .models import Employee
from .serializers import EmployeeSerializer
from enterprise.permissions import IsAdminRole

class BranchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request,id=None):
        user = request.user
        print("HERE")
        enterprise = user.employee.enterprise
        print("NOT HERE")
        if id:
            branch = enterprise.branches.get(id=id)
            serializer = BranchSerializer(branch)
            return Response(serializer.data)
        print(user.employee.role)
        if user.employee.role == 'Admin':
            print("YES HEREEE")
            if user.employee.branch:
                branch = user.employee.branch
                serializer = BranchSerializer(branch)
                return Response([serializer.data])
            branches = enterprise.branches.all()
            print("branches",branches)
            serializer = BranchSerializer(branches, many=True)
            return Response(serializer.data)
        else:
            print("NO HEREEE")
            branch = user.employee.branch
            print(branch)
            serializer = BranchSerializer(branch)
            print(serializer.data)
            return Response([serializer.data])

class BranchEmployeeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request,id):
        user = request.user
        enterprise = user.employee.enterprise
        if user.employee.role != "Employee":
            employee = Employee.objects.filter(branch=id)
            serializer = EmployeeSerializer(employee, many=True)
            return Response(serializer.data)
        else:
            return Response("You are not authorized to view this page")
        
    def post(self, request,id):
        user = request.user
        enterprise = user.employee.enterprise
        if user.employee.role == 'Admin':
            data = request.data
            data['branch'] = id
            data['enterprise'] = request.user.employee.enterprise.id
            serializer = EmployeeSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors)
        else:
            return Response("You are not authorized to view this page")
    
    def patch(self, request,id):
        user = request.user
        enterprise = user.employee.enterprise
        if user.employee.role == 'Admin':
            employee = Employee.objects.get(id=id)
            serializer = EmployeeSerializer(employee, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors)
        else:
            return Response("You are not authorized to view this page")
    
    def delete(self, request,id):
        user = request.user
        enterprise = user.employee.enterprise
        if user.employee.role == 'Admin':
            employee = Employee.objects.get(id=id)
            employee.delete()
            return Response(status=204)
        else:
            return Response("You are not authorized to view this page")


class UserBranchView(APIView):

    def get(self,request):
        role = request.user.employee.role
        branch = request.user.employee.branch
        if branch:
            branch_serializer = BranchSerializer(branch)
            return Response(branch_serializer.data)
        return Response(None)
    

class RoleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.employee.role
        return Response(role)


def _resolve_user_enterprise(user):
    if hasattr(user, 'employee') and user.employee and user.employee.enterprise:
        return user.employee.enterprise
    if hasattr(user, 'profile') and user.profile and user.profile.enterprise:
        return user.profile.enterprise
    return None


class EnterpriseHierarchyAPIView(APIView):
    """Get hierarchical structure of enterprises, branches, and departments"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        enterprise = _resolve_user_enterprise(request.user)
        if enterprise is None:
            return Response({'error': 'No enterprise found for user'}, status=HTTP_403_FORBIDDEN)
        
        serializer = EnterpriseHierarchySerializer(enterprise)
        return Response({'enterprises': [serializer.data]})


class EnterpriseUpdatePreferenceAPIView(APIView):
    """Update enterprise date format preference"""
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, enterprise_id):
        enterprise = _resolve_user_enterprise(request.user)
        if enterprise is None or enterprise.id != enterprise_id:
            return Response({'error': 'Not authorized to update this enterprise'}, status=HTTP_403_FORBIDDEN)

        date_format_preference = request.data.get('date_format_preference')
        if date_format_preference not in ('ad', 'bs'):
            return Response({'error': 'Invalid date_format_preference. Must be "ad" or "bs"'}, status=HTTP_400_BAD_REQUEST)

        enterprise.date_format_preference = date_format_preference
        enterprise.save(update_fields=['date_format_preference'])

        from .serializers import EnterpriseDetailSerializer
        serializer = EnterpriseDetailSerializer(enterprise)
        return Response({
            'message': 'Enterprise date format preference updated successfully',
            'enterprise': serializer.data
        })
