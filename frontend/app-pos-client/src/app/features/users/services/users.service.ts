import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../../shared/config/api.config';
import { UserRole } from '../../../core/auth/auth.service';

/** SEC-01: usuario del sistema (pantalla Usuarios, sólo administrador). */
export interface AppUser {
  userId: number;
  username: string;
  fullName?: string | null;
  role: UserRole;
  sectionId?: number | null;
  sectionName?: string | null;
  isActive: boolean;
  createdAt: string;
  lastAccess?: string | null;
  /** Bloqueado temporalmente por intentos fallidos. */
  isLocked: boolean;
  lockoutUntil?: string | null;
}

export interface CreateUserRequest {
  username: string;
  fullName: string | null;
  password: string;
  role: UserRole;
  sectionId: number | null;
}

export interface UpdateUserRequest {
  fullName: string | null;
  role: UserRole;
  sectionId: number | null;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_URL}/Users`;

  getUsers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(this.apiUrl);
  }

  createUser(user: CreateUserRequest): Observable<{ message: string; userId: number }> {
    return this.http.post<{ message: string; userId: number }>(this.apiUrl, user);
  }

  updateUser(userId: number, user: UpdateUserRequest): Observable<{ message: string; userId: number }> {
    return this.http.put<{ message: string; userId: number }>(`${this.apiUrl}/${userId}`, user);
  }

  resetPassword(userId: number, newPassword: string): Observable<{ message: string; userId: number }> {
    return this.http.put<{ message: string; userId: number }>(`${this.apiUrl}/${userId}/password`, { newPassword });
  }
}
