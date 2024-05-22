import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { BehaviorSubject, Observable, of, catchError, finalize, tap, throwError, EMPTY, map } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

import { User, UserWithToken } from '../interfaces/user.interface';
import { ApiResponse } from '../../core/interfaces';

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
  private userImagesCache: Map<string, Observable<string>> = new Map();
  private userData$: Observable<ApiResponse<User>> | null = null;
  private isFetching: boolean = false;

  constructor(
    private _http: HttpClient,
    private sanitizer: DomSanitizer,
    private _router: Router,
    private _responseHandler: ResponseHandlingService,
    private _errorHandler: ErrorHandlingService,
    private _spinnerService: SpinnerService
  ) { }


  getUser(): Observable<ApiResponse<User>> {
    const token = this.getToken();
    if (!token) {
      this.logout();
      return EMPTY;
    }
    if (!this.userData$ || !this.isFetching) {
      this.isFetching = true;
      const call = this._http.get<ApiResponse<User>>(`${this.url}${API_ENDPOINTS.getUser}`);
      this.userData$ = this.handleApiCall(call, () => { }).pipe(
        tap(() => console.log('Fetching data...')),
        shareReplay(1),
        finalize(() => {
          this.userData$ = null;
          this.isFetching = false;
          console.log('Cache cleared');
        })
      );
    }
    return this.userData$;
  }

  clearUserDataCache() {
    this.userData$ = null;
  }
  

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

  private removeToken(): void {
    localStorage.removeItem('token');
    sessionStorage.removeItem('userData');
    this._router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  logout(): void {
    this.removeToken();
  }

  getUserImageUrl(profileImage: string): Observable<string> {
    if (!this.userImagesCache.has(profileImage)) {
      const observable = this._http.get<Blob>(`${this.url}${API_ENDPOINTS.getUserImageUrl}/${profileImage}`, { responseType: 'blob' as 'json' }).pipe(
        map(blob => {
          const objectUrl = URL.createObjectURL(blob);
          return objectUrl;
        }),
        shareReplay(1),
        finalize(() => this.userImagesCache.delete(profileImage))
      );
      this.userImagesCache.set(profileImage, observable);
    }
    return this.userImagesCache.get(profileImage)!;
  }

  updateProfileImage(userName: string, formData: FormData): Observable<any> {
    const url = `${this.url}${API_ENDPOINTS.updateProfileImage}/${userName}`;
    const call = this._http.put<any>(url, formData);
    return this.handleApiCall(call, response => {
      this._responseHandler.handleResponse(response);
    });
  }


  getUserById(id: string): Observable<ApiResponse<User>> {
    const token = this.getToken();
    if (!token) {
      this._router.navigate(['/auth/login']);
      return EMPTY;
    }
    const call = this._http.get<ApiResponse<User>>(`${this.url}${API_ENDPOINTS.getUserById}/${id}`);
    return this.handleApiCall(call, () => { });
  }


  createUser(data: FormData): Observable<ApiResponse<User>> {
    const call = this._http.post<ApiResponse<User>>(`${this.url}${API_ENDPOINTS.createUser}`, data);
    return this.handleApiCall(call, response => {
      this._responseHandler.handleResponse(response);
    });
  }


  updateUser(data: FormData, id: string): Observable<ApiResponse<User>> {
    const call = this._http.put<ApiResponse<User>>(`${this.url}${API_ENDPOINTS.updateUser}/${id}`, data);
    return this.handleApiCall(call, response => {
      this._responseHandler.handleResponse(response);
    });
  }


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



  // getSafeUrl(objectUrl: string): SafeUrl {
  //   return this.sanitizer.bypassSecurityTrustUrl(objectUrl);
  // }
