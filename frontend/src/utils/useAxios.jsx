import axios from 'axios';
import {jwtDecode} from 'jwt-decode';
import dayjs from 'dayjs';
import { useState } from 'react';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const useAxios = () => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const axiosInstance = axios.create({
        baseURL,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    });

    axiosInstance.interceptors.request.use(async req => {
        const user = jwtDecode(localStorage.getItem('accessToken'));
        const isExpired = dayjs.unix(user.exp).diff(dayjs()) < 1;
        if (isExpired && !isRefreshing) {
            console.log("Token expired!");
            console.log("Refreshing Token ......");
            setIsRefreshing(true);
            try {
                const response = await axios.post(`${baseURL}/userauth/refresh-token/`, {
                    refresh: localStorage.getItem('refreshToken'),
                });
                localStorage.setItem('accessToken', response.data.access);
                req.headers.Authorization = `Bearer ${response.data.access}`;
            } catch (error) {
                console.error("Failed to refresh token:", error);
                // Handle token refresh failure (e.g., redirect to login page)
            } finally {
                setIsRefreshing(false);
            }
        }
        return req;
    });

    return axiosInstance;
};

export default useAxios;
