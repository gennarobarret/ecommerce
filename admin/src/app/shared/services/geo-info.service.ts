import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from 'src/app/core/config/GLOBAL';
import { HttpClient, HttpHeaders } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class GeoInfoService {
  public url;
  constructor(private _http: HttpClient) {
    this.url = GLOBAL.url;
  }

  get_Countries(): Observable<any> {
    return this._http.get('assets/data/countries.json');
  }

  get_States(): Observable<any> {
    return this._http.get('assets/data/states.json');
  }


}
