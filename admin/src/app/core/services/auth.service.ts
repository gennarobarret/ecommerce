// Angular core and related imports
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

// Third-party libraries
import { JwtHelperService } from '@auth0/angular-jwt';

// RxJS imports
import { Observable, Subject, catchError, finalize, tap } from 'rxjs';

// Application-specific interfaces
import { UserWithToken } from '../interfaces/user.interface';
import { LoginCredentials } from '../../core/interfaces';
import { ApiResponse } from '../../core/interfaces';
import { ForgotPasswordRequest } from '../../core/interfaces';
import { VerificationCodeWithTokenRequest } from '../../core/interfaces';
import { ResetPasswordRequest } from '../../core/interfaces';
import { GoogleAuthTokenRequest } from '../../core/interfaces';
import { ResendVerificationEmailRequest } from '../../core/interfaces';



// Configuration and services
import { GLOBAL } from '../config/GLOBAL';
import { ResponseHandlingService } from './response-handling.service';
import { ErrorHandlingService } from './error-handling.service';
import { SpinnerService } from './spinner.service';

// Helper to manage API endpoints in a centralized way
const API_ENDPOINTS = {
  loginUser: 'loginUser',
  authenticateGoogle: 'auth/google',
  forgotPassword: 'forgotPassword',
  createMasterAdmin: 'createMasterAdmin',
  activation: 'activation/',
  verificationCode: 'verification-code/',
  resetPassword: 'resetPassword/',
  resendVerificationEmail: 'resendVerificationEmail'
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private url: string = GLOBAL.url;
  private loginSuccessSubject = new Subject<boolean>();
  public loginSuccessObservable = this.loginSuccessSubject.asObservable();

  constructor(
    private _http: HttpClient,
    private _router: Router,
    private _responseHandler: ResponseHandlingService,
    private _errorHandler: ErrorHandlingService,
    private _spinnerService: SpinnerService
  ) { }

  private storeToken(token: string): void {
    localStorage.setItem('token', token);
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

  handleApiCall<T>(call: Observable<T>, tapHandler: (response: any) => void): Observable<T> {
    this._spinnerService.show();
    return call.pipe(
      tap(tapHandler),
      catchError(error => this._errorHandler.handleError(error)),
      finalize(() => this._spinnerService.hide())
    );
  }


  loginUser(credentials: LoginCredentials): Observable<ApiResponse<UserWithToken>> {
    const call = this._http.post<ApiResponse<UserWithToken>>(`${this.url}${API_ENDPOINTS.loginUser}`, credentials);
    return this.handleApiCall(call, response => {
      if (response.data && response.data.token) {
        this.storeToken(response.data.token);
        this._router.navigate(['/dashboard']);
        this.loginSuccessSubject.next(true);
      } else {
        throw new Error('Authentication failed: No token received');
      }
    });
  }

  authenticateWithGoogle(token: string): Observable<ApiResponse<UserWithToken>> {
    const call = this._http.post<ApiResponse<UserWithToken>>(`${this.url}${API_ENDPOINTS.authenticateGoogle}`, { token });
    return this.handleApiCall(call, response => {
      if (response.data && response.data.token) {
        this.storeToken(response.data.token);
        this._router.navigate(['/dashboard']);
        this.loginSuccessSubject.next(true);
      } else {
        throw new Error('Authentication failed: No token received');
      }
    });
  }

  activateAccount(token: string): Observable<any> {
    const call = this._http.get<any>(`${this.url}${API_ENDPOINTS.activation}${token}`);
    return this.handleApiCall(call, response => { this._responseHandler.handleResponse(response); });
  }
  

  forgotPassword(emailAddress: ForgotPasswordRequest): Observable<ApiResponse<null>> {
    const call = this._http.post<ApiResponse<null>>(`${this.url}${API_ENDPOINTS.forgotPassword}`, emailAddress);
    return this.handleApiCall(call, response => { this._responseHandler.handleResponse(response); });
  }

  verificationCode(token: string, verificationCode: string): Observable<any> {
    const call = this._http.post<any>(`${this.url}${API_ENDPOINTS.verificationCode}${token}`, { token, verificationCode });
    return this.handleApiCall(call, response => { this._responseHandler.handleResponse(response); });
  }

  resetPassword(token: string, newPassword: string): Observable<ApiResponse<null>> {
    const call = this._http.post<ApiResponse<null>>(`${this.url}${API_ENDPOINTS.resetPassword}${token}`, { token, newPassword });
    return this.handleApiCall(call, response => { this._responseHandler.handleResponse(response); });
  }

  resendVerificationEmail(emailAddress: ResendVerificationEmailRequest): Observable<ApiResponse<null>> {
    const call = this._http.post<ApiResponse<null>>(`${this.url}${API_ENDPOINTS.resendVerificationEmail}`, { emailAddress });
    return this.handleApiCall(call, response => { this._responseHandler.handleResponse(response); });
  }

  isAuthenticated(allowedRoles: string[]): boolean {
    try {
      const token = this.getToken();
      if (!token) return false;
      const helper = new JwtHelperService();
      const decodedToken = helper.decodeToken(token);
      const isExpired = helper.isTokenExpired(token);
      if (isExpired) {
        this.logout();
        return false;
      }

      if (!decodedToken || !decodedToken.role) {
        this.logout();
        return false;
      }

      sessionStorage.setItem('userData', JSON.stringify({
        id: decodedToken.sub,
        userName: decodedToken.userName,
        firstName: decodedToken.firstName,
        lastName: decodedToken.lastName,
        emailAddress: decodedToken.emailAddress,
        profileImage: decodedToken.profileImage,
        role: decodedToken.role,
      }));

      return allowedRoles.includes(decodedToken.role);
    } catch (error) {
      console.error("Authentication Error: ", error);
      this.logout();
      return false;
    }
  }

  createMasterAdmin(data: any): Observable<any> {
    const call = this._http.post(`${this.url}${API_ENDPOINTS.createMasterAdmin}`, data);
    return this.handleApiCall(call, response => { this._responseHandler.handleResponse(response); });
  }

}

// // Angular core and related imports
// import { Injectable, OnDestroy } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Router } from '@angular/router';

// // Third-party libraries
// import { JwtHelperService } from '@auth0/angular-jwt';

// // RxJS imports
// import {
//   Observable, Subject, BehaviorSubject, throwError,
//   catchError, finalize, tap, switchMap, retry, debounceTime, takeUntil, shareReplay
// } from 'rxjs';

// // Application-specific interfaces
// import { LoginCredentials } from '../../core/interfaces';
// import { ApiResponse } from '../interfaces/api-response.interface';
// import { UserWithToken } from '../interfaces/user.interface';
// import { ForgotPasswordRequest } from '../interfaces/forgot-password.interface';

// // Configuration and services
// import { GLOBAL } from '../config/GLOBAL';
// import { ResponseHandlingService } from './response-handling.service';
// import { ErrorHandlingService } from './error-handling.service';
// import { SpinnerService } from './spinner.service';

// // Helper to manage API endpoints in a centralized way
// const API_ENDPOINTS = {
//   loginUser: 'loginUser',
//   authenticateGoogle: 'auth/google',
//   forgotPassword: 'forgotPassword',
//   createMasterAdmin: 'createMasterAdmin',
//   activation: 'activation/',
//   verificationCode: 'verification-code/',
//   resetPassword: 'resetPassword/',
//   resendVerificationEmail: 'resendVerificationEmail'
// };

// @Injectable({
//   providedIn: 'root',
// })
// export class AuthService implements OnDestroy {

//   private url: string = GLOBAL.url;
//   private loginSuccessSubject = new BehaviorSubject<boolean>(false);
//   public loginSuccessObservable = this.loginSuccessSubject.asObservable().pipe(shareReplay(1));
//   private unsubscribe$ = new Subject<void>();

//   constructor(
//     private _http: HttpClient,
//     private _router: Router,
//     private _responseHandler: ResponseHandlingService,
//     private _errorHandler: ErrorHandlingService,
//     private _spinnerService: SpinnerService,
//     private _jwtHelper: JwtHelperService
//   ) { }

//   ngOnDestroy(): void {
//     this.unsubscribe$.next();
//     this.unsubscribe$.complete();
//   }

//   private storeToken(token: string): void {
//     localStorage.setItem('token', token);
//   }

//   private removeToken(): void {
//     localStorage.removeItem('token');
//     sessionStorage.removeItem('userData');
//     this._router.navigate(['/auth/login']);
//   }

//   getToken(): string | null {
//     return localStorage.getItem('token');
//   }

//   logout(): void {
//     this.removeToken();
//   }

//   handleApiCall<T>(call: Observable<T>, tapHandler: (response: any) => void): Observable<T> {
//     this._spinnerService.show();
//     return call.pipe(
//       tap(tapHandler),
//       catchError(error => this._errorHandler.handleError(error)),
//       finalize(() => this._spinnerService.hide())
//     );
//   }


//   loginUser(credentials: LoginCredentials): Observable<ApiResponse<UserWithToken>> {
//     const call = this._http.post<ApiResponse<UserWithToken>>(`${this.url}/${API_ENDPOINTS.loginUser}`, credentials);
//     return this.handleApiCall(call, response => {
//       if (response.data && response.data.token) {
//         this.storeToken(response.data.token);
//         this._router.navigate(['/']);
//         this.loginSuccessSubject.next(true);
//       }
//     });
//   }

//   authenticateWithGoogle(token: string): Observable<any> {
//     const call = this._http.post(`${this.url}/${API_ENDPOINTS.authenticateGoogle}`, { token });
//     return this.handleApiCall(call, response => {
//       if (response && response.token) {
//         this.storeToken(response.token);
//         this.loginSuccessSubject.next(true);
//       }
//     });
//   }

//   forgotPassword(request: ForgotPasswordRequest): Observable<any> {
//     const call = this._http.post<any>(`${this.url}/${API_ENDPOINTS.forgotPassword}`, request);
//     return this.handleApiCall(call, response => { });
//   }

//   createMasterAdmin(data: any): Observable<any> {
//     const call = this._http.post(`${this.url}/${API_ENDPOINTS.createMasterAdmin}`, data);
//     return this.handleApiCall(call, response => { });
//   }

//   activateAccount(token: string): Observable<any> {
//     const call = this._http.get(`${this.url}/${API_ENDPOINTS.activation}${token}`);
//     return this.handleApiCall(call, response => { });
//   }

//   verificationCode(token: string, verificationCode: string): Observable<any> {
//     const call = this._http.post(`${this.url}/${API_ENDPOINTS.verificationCode}${token}`, { token, verificationCode });
//     return this.handleApiCall(call, response => { });
//   }

//   resetPassword(token: string, newPassword: string): Observable<any> {
//     const call = this._http.post<any>(`${this.url}/${API_ENDPOINTS.resetPassword}${token}`, { newPassword });
//     return this.handleApiCall(call, response => { });
//   }

//   resendVerificationEmail(emailAddress: string): Observable<any> {
//     const call = this._http.post(`${this.url}/${API_ENDPOINTS.resendVerificationEmail}`, { emailAddress });
//     return this.handleApiCall(call, response => { });
//   }

//   isAuthenticated(allowedRoles: string[]): boolean {
//     try {
//       const token = this.getToken();
//       if (!token) return false;
//       const helper = new JwtHelperService();
//       const decodedToken = helper.decodeToken(token);
//       const isExpired = helper.isTokenExpired(token);
//       if (isExpired) {
//         this.logout();
//         return false;
//       }

//       if (!decodedToken || !decodedToken.role) {
//         this.logout();
//         return false;
//       }

//       sessionStorage.setItem('userData', JSON.stringify({
//         id: decodedToken.sub,
//         userName: decodedToken.userName,
//         firstName: decodedToken.firstName,
//         lastName: decodedToken.lastName,
//         emailAddress: decodedToken.emailAddress,
//         profileImage: decodedToken.profileImage,
//         role: decodedToken.role,
//       }));

//       return allowedRoles.includes(decodedToken.role);
//     } catch (error) {
//       console.error("Authentication Error: ", error);
//       this.logout();
//       return false;
//     }
//   }
// }
