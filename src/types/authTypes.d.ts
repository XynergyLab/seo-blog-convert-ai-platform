export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile extends User {
  preferences?: Record<string, any>;
}

export interface AuthResponse {
  user: User;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface LoginParams {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RefreshTokenParams {
  refreshToken: string;
}

export interface ServerConnection {
  id?: string;
  name: string;
  url: string;
  apiUrl?: string;
  apiKey?: string;
  isDefault?: boolean;
  status?: 'connected' | 'disconnected' | 'connecting';
  connected?: boolean;
  lastConnectedAt?: string;
  lastActive?: Date;
  latency?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile extends User {
  preferences?: Record<string, any>;
}

export interface AuthResponse {
  user: User;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface LoginParams {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RefreshTokenParams {
  refreshToken: string;
}

export interface ServerConnection {
  id?: string;
  name: string;
  url: string;
  apiUrl?: string;
  apiKey?: string;
  isDefault?: boolean;
  status?: 'connected' | 'disconnected' | 'connecting';
  connected?: boolean;
  lastConnectedAt?: string;
  lastActive?: Date;
  latency?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface RefreshTokenParams {
  refreshToken: string;
}

export interface ServerConnection {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile extends User {
  preferences?: Record<string, any>;
}

interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

interface LoginParams {
  email: string;
  password: string;
  remember?: boolean;
}

interface RefreshTokenParams {
  refreshToken: string;
}

interface ServerConnection {
  id?: string;
  url: string;
  name: string;
  apiKey?: string;
  status: 'connected' | 'disconnected' | 'connecting';
  lastConnectedAt?: string;
  latency?: number;
}

export type { 
  User, 
  UserProfile, 
  AuthResponse, 
  LoginParams, 
  RefreshTokenParams, 
  ServerConnection 
};

// Authentication related types
interface AuthResponse {
  token: string;
  expiresIn: number;
  user: User;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface ServerConnection {
  url: string;
  connected: boolean;
  lastActive?: Date;
}

