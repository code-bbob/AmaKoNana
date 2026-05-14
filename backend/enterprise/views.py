from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_date
from datetime import datetime, date
from .serializers import BranchSerializer
from .models import Branch
from .models import Employee
from .serializers import EmployeeSerializer

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
