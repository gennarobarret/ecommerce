import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GLOBAL } from '../config/GLOBAL';
import { User } from '../interfaces/user.interface';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
  
export class UserManagementService {
  private url: string = GLOBAL.url;

  constructor(private _http: HttpClient, private _router: Router) { }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): Observable<ApiResponse<User>> {
    const token = this.getToken();
    if (!token) {
      this._router.navigate(['/auth/login']);
      return EMPTY;
    }
    return this._http.get<ApiResponse<User>>(`${this.url}getUser`).pipe(
      catchError(error => {
        return throwError(error);
      })
    );
  }


  getUserById(id: string): Observable<ApiResponse<User>> {
    const token = this.getToken();
    if (!token) {
      this._router.navigate(['/auth/login']);
      return EMPTY;
    }
    return this._http.get<ApiResponse<User>>(`${this.url}getUserById/${id}`).pipe(
      catchError(error => {
        return throwError(error);
      })
    );
  }

    
  createUser(data: FormData): Observable<ApiResponse<User>> {
    // console.log('Enviando datos a createUser:', data);
    data.forEach((value, key) => {
      console.log(key + ', ' + value);
    });
    return this._http.post<ApiResponse<User>>(`${this.url}createUser`, data).pipe(
      catchError(error => {
        console.error('Error en createUser:', error);
        return throwError(() => error);
      })
    );
  }


  updateUser(data: FormData, id: any): Observable<ApiResponse<User>> {
    return this._http.put<ApiResponse<User>>(`${this.url}updateUser/${id}`, data).pipe(
      catchError(error => {
        return throwError(error);
      })
    );
  }


  listAllUsers(filterKey?: string, filterValue?: string): Observable<ApiResponse<User[]>> {
    let params = new HttpParams();
    if (filterKey && filterValue) {
      params = params.append('type', filterKey); // 'type' es el campo por el cual filtrar
      params = params.append('filter', filterValue); // 'filter' es el valor de búsqueda
    }
    return this._http.get<ApiResponse<User[]>>(`${this.url}listAllUsers`, { params }).pipe(
      catchError(error => {
        return throwError(error);
      })
    );
  }


}
