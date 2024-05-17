import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { User } from 'src/app/core/interfaces/user.interface';
import { GeoInfoService } from 'src/app/shared/services/geo-info.service';
import { ValidationService } from 'src/app/core/services/validation.service';
import { GLOBAL } from 'src/app/core/config/GLOBAL';
import { Subscription } from 'rxjs';
import { Country } from 'src/app/core/interfaces/country.interface';
import { State } from 'src/app/core/interfaces/state.interface';
import { UserManagementService } from 'src/app/core/services/user-management.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  updateForm!: FormGroup;
  url = GLOBAL.url;
  user: User | null = null;
  countries: Country[] = [];
  states: State[] = [];
  filteredStates: State[] = [];
  load_data: boolean = false;

  private userId: string = '';
  private subscriptions = new Subscription();

  constructor(
    private _router: Router,
    private _formBuilder: FormBuilder,
    private _authService: AuthService,
    private _toastService: ToastService,
    private _geoInfoService: GeoInfoService,
    private _validationService: ValidationService,
    private _userManagementService: UserManagementService
  ) {
    this.updateForm = this._formBuilder.group({
      inputUserName: [{ value: '', disabled: true }, [Validators.required]],
      inputFirstName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(25), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
      inputLastName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(25), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
      inputOrganizationName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
      inputEmailAddress: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      inputCountryAddress: ['', [Validators.required]],
      inputStateAddress: ['', [Validators.required]],
      inputPhoneNumber: ['', [Validators.required, Validators.pattern('[0-9]+')]],
      inputBirthday: ['', [Validators.required, this._validationService.validateDate.bind(this)]],
      inputRole: [{ value: '', disabled: true }, [Validators.required]],
      inputIdentification: ['', [Validators.required]],
      inputAdditionalInfo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(50), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
    });
  }

  ngOnInit(): void {
    this.fetchUserData();
    this.loadCountries();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  fetchUserData() {
    this.load_data = true;
    this._userManagementService.getUser().subscribe(
      (response) => {
        if (!response || !response.data) {
          console.error('Error: User data is missing');
          this._router.navigate(['']);
          return;
        }

        this.user = response.data as User;
        if (!this.user._id) {
          console.error('Error: _id is missing from the user data');
          return;
        }

        this.userId = this.user._id;
        this.updateFormWithUserData(this.user);
        this.filterStatesByCountry(this.user.countryAddress);
        this.load_data = false;
      },
      (error) => {
        console.error(error);
      }
    );
  }

  private updateFormWithUserData(userData: User) {
    let formattedBirthday = '';
    if (userData.birthday) {
      const birthdayDate = new Date(userData.birthday);
      if (!isNaN(birthdayDate.getTime())) {
        formattedBirthday = birthdayDate.toISOString().split('T')[0];
      }
    }

    this.updateForm.patchValue({
      inputUserName: userData.userName,
      inputFirstName: userData.firstName,
      inputLastName: userData.lastName,
      inputOrganizationName: userData.organizationName,
      inputCountryAddress: userData.countryAddress,
      inputStateAddress: userData.stateAddress,
      inputEmailAddress: userData.emailAddress,
      inputPhoneNumber: userData.phoneNumber,
      inputBirthday: formattedBirthday,
      inputRole: userData.role,
      inputIdentification: userData.identification,
      inputAdditionalInfo: userData.additionalInfo,
    });
  }

  private loadCountries() {
    this._geoInfoService.get_Countries().subscribe(
      (data) => {
        this.countries = data.sort((a: Country, b: Country) =>
          a.name.localeCompare(b.name)
        );
        this.loadStates();
      },
      (error) => {
        console.error('Error loading countries', error);
      }
    );
  }

  private loadStates() {
    this._geoInfoService.get_States().subscribe(
      (data) => {
        this.states = data.sort((a: State, b: State) =>
          a.province_name.localeCompare(b.province_name)
        );
      },
      (error) => {
        console.error('Error loading states', error);
      }
    );
  }

  filterStatesByCountry(countryId: string | number) {
    const numericCountryId = Number(countryId);
    this.filteredStates = this.states.filter(
      (state) => state.country_id === numericCountryId
    );
    const stateControl = this.updateForm.get('inputStateAddress');
    if (stateControl) {
      stateControl.setValue(null);
    }
  }

  onCountryChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const countryId = selectElement.value;
    this.filterStatesByCountry(countryId);
    const stateControl = this.updateForm.get('inputStateAddress');
    if (stateControl) {
      stateControl.setValue('');
    }
  }

  update() {
    if (this.updateForm.invalid) {
      for (const control of Object.keys(this.updateForm.controls)) {
        this.updateForm.controls[control].markAsTouched();
      }
      this._toastService.showToast('error', 'There are errors on the form. Please check the fields.');
      return;
    }

    const formData = new FormData();
    formData.append('_id', this.userId);
    formData.append('userName', this.updateForm.value.inputUserName);
    formData.append('firstName', this.updateForm.value.inputFirstName);
    formData.append('lastName', this.updateForm.value.inputLastName);
    formData.append('organizationName', this.updateForm.value.inputOrganizationName);
    formData.append('emailAddress', this.updateForm.value.inputEmailAddress);
    formData.append('countryAddress', this.updateForm.value.inputCountryAddress);
    formData.append('stateAddress', this.updateForm.value.inputStateAddress);
    formData.append('phoneNumber', this.updateForm.value.inputPhoneNumber);
    formData.append('birthday', this.updateForm.value.inputBirthday);
    formData.append('role', this.updateForm.value.inputRole);
    formData.append('identification', this.updateForm.value.inputIdentification);
    formData.append('additionalInfo', this.updateForm.value.inputAdditionalInfo);

    this._userManagementService.updateUser(formData, this.userId).subscribe({
      next: (response) => {
        this._toastService.showToast('success', 'New profile data has been successfully updated.');
      },
      error: (error) => {
        this._toastService.showToast('error', 'Update failed');
      },
    });
  }
}
