import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResponseHandlingService {
  private messageSubject = new Subject<string>();
  public message$ = this.messageSubject.asObservable();

  constructor() { }

  public handleResponse(response: any) {
    let message = 'Ocurrió un response desconocido';

    // Verificar si la respuesta es un HttpResponse
    if (response instanceof HttpResponse) {
      // Verificar si la respuesta tiene un cuerpo JSON
      if (response.body) {
        // Manejar respuesta exitosa del servidor con cuerpo JSON
        message = `Respuesta del servidor recibida: ${response.status} - ${response.statusText}`;
        console.log(message);
        this.messageSubject.next(message);
        return response;
      } else {
        // Si la respuesta no tiene cuerpo, es una respuesta vacía
        message = `Respuesta del servidor recibida: ${response.status} - ${response.statusText}`;
        console.log(message);
        this.messageSubject.next(message);
        return response;
      }
    } else if (typeof response === 'object' && response !== null) {
      // Si la respuesta es un objeto JSON
      if (response.status === 'success') {
        // Si la respuesta tiene el estado 'success', es una respuesta satisfactoria
        message = response.message;
        console.log(message);
        this.messageSubject.next(message);
        return response;
      } else {
        // Si la respuesta tiene un estado diferente de 'success', es un error
        message = response.message || 'Ocurrió un error en el servidor';
        console.error(response.message);
        this.messageSubject.next(message);
        return throwError(() => new Error(message));
      }
    } else {
      // Si no se puede manejar la respuesta, lanzar un error
      console.error('No se pudo manejar la respuesta del servidor:', response);
      throw new Error('Error al manejar la respuesta del servidor');
    }
  }
}