from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_date
from datetime import datetime, date
from .serializers import BranchSerializer
from .models import Branch
from alltransactions.models import Staff
from alltransactions.serializers import StaffSerializer

class BranchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request,id=None):
        user = request.user
        print("HERE")
        enterprise = user.person.enterprise
        print("NOT HERE")
        if id:
            branch = enterprise.branch.get(id=id)
            serializer = BranchSerializer(branch)
            return Response(serializer.data)
        if user.person.role == 'Admin':
            if user.person.branch:
                branch = user.person.branch
                serializer = BranchSerializer(branch)
                return Response([serializer.data])
            branches = enterprise.branch.all()
            serializer = BranchSerializer(branches, many=True)
            return Response(serializer.data)
        else:
            branch = user.person.branch
            print(branch)
            serializer = BranchSerializer(branch)
            print(serializer.data)
            return Response([serializer.data])

class BranchStaffView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request,id):
        user = request.user
        enterprise = user.person.enterprise
        if user.person.role == 'Admin':
            staff = Staff.objects.filter(branch=id)
            serializer = StaffSerializer(staff, many=True)
            return Response(serializer.data)
        else:
            return Response("You are not authorized to view this page")
        
    def post(self, request,id):
        user = request.user
        enterprise = user.person.enterprise
        if user.person.role == 'Admin':
            data = request.data
            data['branch'] = id
            data['enterprise'] = request.user.person.enterprise.id
            serializer = StaffSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors)
        else:
            return Response("You are not authorized to view this page")
    
    def patch(self, request,id):
        user = request.user
        enterprise = user.person.enterprise
        if user.person.role == 'Admin':
            staff = Staff.objects.get(id=id)
            serializer = StaffSerializer(staff, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors)
        else:
            return Response("You are not authorized to view this page")
    
    def delete(self, request,id):
        user = request.user
        enterprise = user.person.enterprise
        if user.person.role == 'Admin':
            staff = Staff.objects.get(id=id)
            staff.delete()
            return Response(status=204)
        else:
            return Response("You are not authorized to view this page")


class UserBranchView(APIView):

    def get(self,request):
        role = request.user.person.role
        branch = request.user.person.branch
        if branch:
            branch_serializer = BranchSerializer(branch)
            return Response(branch_serializer.data)
        return Response(None)
    

class RoleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.person.role
        return Response(role)