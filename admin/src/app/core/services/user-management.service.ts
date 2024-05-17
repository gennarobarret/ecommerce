// Angular core and related imports
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';

// RxJS imports
import { Observable, Subject, catchError, finalize, tap, throwError, EMPTY } from 'rxjs';

// Application-specific interfaces
import { User, UserWithToken } from '../interfaces/user.interface';
import { ApiResponse } from '../../core/interfaces';

// Configuration and services
import { GLOBAL } from '../config/GLOBAL';
import { ResponseHandlingService } from './response-handling.service';
import { ErrorHandlingService } from './error-handling.service';
import { SpinnerService } from './spinner.service';

// Helper to manage API endpoints in a centralized way
const API_ENDPOINTS = {
  updateProfileImage: 'updateUserImage',
  getUser: 'getUser',
  getUserImageUrl: 'getUserImage',
  getUserById: 'getUserById',
  createUser: 'createUser',
  updateUser: 'updateUser',
  listAllUsers: 'listAllUsers'
};

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private url: string = GLOBAL.url;

  constructor(
    private _http: HttpClient,
    private _router: Router,
    private _responseHandler: ResponseHandlingService,
    private _errorHandler: ErrorHandlingService,
    private _spinnerService: SpinnerService
  ) { }

  private handleApiCall<T>(call: Observable<T>, tapHandler: (response: any) => void): Observable<T> {
    this._spinnerService.show();
    return call.pipe(
      tap(tapHandler),
      catchError(error => {
        this._errorHandler.handleError(error);
        return throwError(() => error);
      }),
      finalize(() => this._spinnerService.hide())
    );
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }



  /**
   * Constructs the URL for the user's profile image
   * @param profileImage - Name of the profile image file
   * @returns string - URL of the profile image
   */

  getUserImageUrl(profileImage: string): Observable<Blob> {
    const call = this._http.get<Blob>(`${this.url}${API_ENDPOINTS.getUserImageUrl}/${profileImage}`, { responseType: 'blob' as 'json' });
    return this.handleApiCall(call, response => {
      this._responseHandler.handleResponse(response);
    });
  }


  /**
   * Updates the profile image of the user
   * @param userId - ID of the user
   * @param formData - FormData containing the new profile image
   * @returns Observable<ApiResponse<any>>
   */
  updateProfileImage(userId: string, formData: FormData): Observable<any> {
    // Asegurarse de que el ID del usuario se añade correctamente a la URL
    const url = `${this.url}${API_ENDPOINTS.updateProfileImage}/${userId}`;
    const call = this._http.put<any>(url, formData);
    return this.handleApiCall(call, response => {
      this._responseHandler.handleResponse(response);
    });
  }


  /**
   * Fetches the current user data
   * @returns Observable<ApiResponse<User>>
   */
  getUser(): Observable<ApiResponse<User>> {
    const token = this.getToken();
    if (!token) {
      this._router.navigate(['/auth/login']);
      return EMPTY;
    }
    const call = this._http.get<ApiResponse<User>>(`${this.url}${API_ENDPOINTS.getUser}`);
    return this.handleApiCall(call, () => { });
  }


  /**
   * Fetches user data by ID
   * @param id - ID of the user
   * @returns Observable<ApiResponse<User>>
   */
  getUserById(id: string): Observable<ApiResponse<User>> {
    const token = this.getToken();
    if (!token) {
      this._router.navigate(['/auth/login']);
      return EMPTY;
    }
    const call = this._http.get<ApiResponse<User>>(`${this.url}${API_ENDPOINTS.getUserById}/${id}`);
    return this.handleApiCall(call, () => { });
  }

  /**
   * Creates a new user
   * @param data - FormData containing user data
   * @returns Observable<ApiResponse<User>>
   */
  createUser(data: FormData): Observable<ApiResponse<User>> {
    const call = this._http.post<ApiResponse<User>>(`${this.url}${API_ENDPOINTS.createUser}`, data);
    return this.handleApiCall(call, response => {
      this._responseHandler.handleResponse(response);
    });
  }

  /**
   * Updates user data
   * @param data - FormData containing updated user data
   * @param id - ID of the user
   * @returns Observable<ApiResponse<User>>
   */
  updateUser(data: FormData, id: string): Observable<ApiResponse<User>> {
    const call = this._http.put<ApiResponse<User>>(`${this.url}${API_ENDPOINTS.updateUser}/${id}`, data);
    return this.handleApiCall(call, response => {
      this._responseHandler.handleResponse(response);
    });
  }

  /**
   * Lists all users with optional filtering
   * @param filterKey - Key to filter by
   * @param filterValue - Value to filter by
   * @returns Observable<ApiResponse<User[]>>
   */
  listAllUsers(filterKey?: string, filterValue?: string): Observable<ApiResponse<User[]>> {
    let params = new HttpParams();
    if (filterKey && filterValue) {
      params = params.append('type', filterKey);
      params = params.append('filter', filterValue);
    }
    const call = this._http.get<ApiResponse<User[]>>(`${this.url}${API_ENDPOINTS.listAllUsers}`, { params });
    return this.handleApiCall(call, () => { });
  }
}
