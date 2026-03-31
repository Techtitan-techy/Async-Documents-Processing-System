import axios from 'axios';
import { ExtractedData } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
});

export const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/documents/upload', formData);
  return response.data;
};

export const getDocuments = async () => {
  const response = await api.get('/documents');
  return response.data;
};

export const getDocument = async (id: string) => {
  const response = await api.get(`/documents/${id}`);
  return response.data;
};

export const retryDocument = async (id: string) => {
  const response = await api.post(`/documents/${id}/retry`);
  return response.data;
};

export const updateResult = async (id: string, updates: Partial<ExtractedData>) => {
  const response = await api.put(`/documents/${id}/result`, updates);
  return response.data;
};

export const finalizeDocument = async (id: string) => {
  const response = await api.post(`/documents/${id}/finalize`);
  return response.data;
};

export const deleteDocument = async (id: string) => {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
};
