// // auth-token.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: token
        }
      });
    }

    return next.handle(request);
  }
}
// import {
//   HttpRequest,
//   HttpResponse,
//   HttpHandler,
//   HttpEvent,
//   HttpInterceptor,
//   HttpErrorResponse,
// } from '@angular/common/http';
// import { Observable, throwError } from 'rxjs';
// import { catchError, tap } from 'rxjs/operators';
// import { AuthService } from '../core/services/auth.service';

// @Injectable()
// export class AuthTokenInterceptor implements HttpInterceptor {
//   constructor(private _authService: AuthService) {}

//   intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
//     const token = this._authService.getToken();
//     if (!(request.body instanceof FormData)) {
//       request = request.clone({
//         setHeaders: {
//           'Content-Type': 'application/json',
//           Authorization: token ? token : '',
//         },
//       });
//     } else if (token) {
//       request = request.clone({
//         setHeaders: {
//           Authorization: token,
//         },
//       });
//     }

//     return next.handle(request).pipe(
//       tap((event: HttpEvent<any>) => {
//         if (event instanceof HttpResponse) {
//           console.log(`Response status: ${event.status} - ${event.statusText}`);
//         }
//       }),
//       catchError((error: HttpErrorResponse) => {
//         console.log("🚀 ~ AuthTokenInterceptor ~ catchError ~ error:", error)
//         return throwError({
//           status: error.status,
//           message: error.message,
//           error: error.error
//         });
//       })
//     );
//   }
// }

// import { Injectable } from '@angular/core';
// import {
//   HttpRequest,
//   HttpResponse,
//   HttpHandler,
//   HttpEvent,
//   HttpInterceptor,
//   HttpErrorResponse
// } from '@angular/common/http';
// import { Observable, throwError } from 'rxjs';
// import { catchError, tap } from 'rxjs/operators';
// import { AuthService } from '../core/services/auth.service';

// @Injectable()
// export class AuthTokenInterceptor implements HttpInterceptor {

//   constructor(
//     private _authService: AuthService,
//   ) { }

//   intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
//     const token = this._authService.getToken();
//     if (!(request.body instanceof FormData)) {
//       request = request.clone({
//         setHeaders: {
//           'Content-Type': 'application/json',
//           Authorization: token ? token : '',
//         }
//       });
//     } else if (token) {
//       request = request.clone({
//         setHeaders: {
//           Authorization: token
//         }
//       });
//     }

//     return next.handle(request).pipe(
//       tap((event: HttpEvent<any>) => {
//         if (event instanceof HttpResponse) {
//           console.log('Response received:', event);
//         }
//       }),
//       catchError((error: HttpErrorResponse) => {
//         let errorMessage = 'Unknown error occurred';
//         if (error.error instanceof ErrorEvent) {
//           // Client-side error
//           errorMessage = error.error.message;
//         } else if (error.status) {
//           // Server-side error
//           errorMessage = `Backend returned code ${error.status}, body was: ${error.error.message || error.message}`;
//           // errorMessage = `${error.error.message || error.message}`;
//         }
//         console.error(errorMessage);
//         return throwError(errorMessage);
//       })
//     );
//   }

// }

// let errorMessage = 'Unknown error occurred';
// if (error.error instanceof ErrorEvent) {
//   errorMessage = error.error.message;
// } else {
//   errorMessage = `${error.status} - ${error.statusText}, ${error.error.message || error.message}`;
// }
// console.log("🚀 ~ AuthTokenInterceptor ~ catchError ~ error:", error)
// console.log("🚀 ~ AuthTokenInterceptor ~ catchError ~ error:", error.error.statusCode)
// console.log("🚀 ~ AuthTokenInterceptor ~ catchError ~ error:", error.error.status)
// console.log("🚀 ~ AuthTokenInterceptor ~ catchError ~ error:", error.error.message)
// console.log("🚀 ~ AuthTokenInterceptor ~ catchError ~ error:", error.error.details)
// console.error(error);
// return throwError(error);