// response-handling.service.ts
import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResponseHandlingService {
  private messageSubject = new Subject<string>();
  public message$ = this.messageSubject.asObservable();

  constructor() { }

  public handleResponse(response: any) {
    if (response instanceof HttpResponse) {
      // Manejo de HttpResponse
      let message = `Respuesta del servidor: ${response.status} - ${response.statusText}`;
      console.log(message);
      this.messageSubject.next(message);
    } else if (response instanceof Blob) {
      // Manejo de Blob
      let message = `Se recibió un archivo Blob de tipo ${response.type} y tamaño ${response.size}`;
      console.log(message);
      this.messageSubject.next(message);
    } else if (response && typeof response === 'object') {
      // Manejo de respuestas JSON típicas
      if (response.status === 'success') {
        console.log(response.message);
        this.messageSubject.next(response.message);
      } else {
        console.error('Respuesta de error:', response.message);
        this.messageSubject.next('Error: ' + response.message);
      }
    } else {
      // Respuestas no esperadas
      console.error('Tipo de respuesta no manejada:', response);
    }
    return response;
  }



  public handleDataResponse(response: any) {
    let message = response.message || 'Operación exitosa';
    console.log(message);
    this.messageSubject.next(message);
    return response.data;
  }
}
