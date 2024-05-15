import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { LoginCredentials } from 'src/app/core/interfaces';
import { SpinnerService } from 'src/app/core/services/spinner.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class LoginComponent implements OnInit {
  isLoading$: Observable<boolean>;
  public loginForm: FormGroup;
  submitted = false;

  constructor(
    private _formBuilder: FormBuilder,
    private _authService: AuthService,
    private _router: Router,
    private _toastService: ToastService,
    public _spinnerService: SpinnerService
  ) {
    this.loginForm = this._formBuilder.group({
      userName: ['', [Validators.required]],
      password: ['', Validators.required],
    });
    this.isLoading$ = this._spinnerService.isLoading$;
  }

  get f() {
    return this.loginForm.controls;
  }

  ngOnInit(): void {
    // if (this._authService.getToken()) {
    //   this._router.navigate(['']);
    // }
  }

  login() {
    this.submitted = true;
    if (this.loginForm.valid) {
      this._authService.loginUser(this.loginForm.value as LoginCredentials)
        .subscribe({
          next: (response) => {
            if (response && response.status === 'success') {
              this._toastService.showToast(response.status, `${response.message}. Welcome ${response.data.user.userName}!`);
            }
          },
          error: (error) => {
            // console.error('Authentication failed:', error);
            this._toastService.showToast(error.error.status, `${error.error.message}`);
          }
        });
    } else {
    
      this._toastService.showToast('error', 'Missing form data');
    }
  }

}
