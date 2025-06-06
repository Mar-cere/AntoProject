import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, logoutUser, updateUser as updateUserService } from '../services/userService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aquí puedes cargar el usuario desde AsyncStorage o tu servicio de autenticación
    // Por ejemplo:
    // const loadUser = async () => {
    //   const storedUser = await AsyncStorage.getItem('user');
    //   if (storedUser) {
    //     setUser(JSON.parse(storedUser));
    //   }
    //   setLoading(false);
    // };
    // loadUser();
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    const response = await loginUser(credentials);
    setUser(response);
    return response;
  };

  const register = async (userData) => {
    const response = await registerUser(userData);
    setUser(response);
    return response;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const updateUser = async (userId, userData) => {
    const response = await updateUserService(userId, userData);
    setUser(response);
    return response;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}; 