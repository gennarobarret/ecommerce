import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { User } from 'src/app/core/interfaces/user.interface';
import { GeoInfoService } from 'src/app/shared/services/geo-info.service';
import { ValidationService } from 'src/app/core/services/validation.service';
import { UserManagementService } from 'src/app/core/services/user-management.service';
import { Country } from 'src/app/core/interfaces/country.interface';
import { State } from 'src/app/core/interfaces/state.interface';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  updateForm!: FormGroup;
  user: User | null = null;
  countries: Country[] = [];
  states: State[] = [];
  filteredStates: State[] = [];
  loading: boolean = false;
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private geoInfoService: GeoInfoService,
    private validationService: ValidationService,
    private userManagementService: UserManagementService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.userManagementService.user$.subscribe(user => {
        if (user) {
          this.user = user;
          this.updateFormWithUserData(this.user);
          if (this.user.countryAddress) {
            this.loadCountriesAndStates(this.user.countryAddress);
          }
        } else {
          this.router.navigate(['']);
        }
      })
    );

    this.fetchUserData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  fetchUserData() {
    this.loading = true;
    this.subscriptions.add(
      this.userManagementService.getUser().subscribe({
        next: (response) => {
          if (response?.data) {
            this.user = response.data;
            this.updateFormWithUserData(this.user);
            if (this.user.countryAddress) {
              this.loadCountriesAndStates(this.user.countryAddress);
            }
          } else {
            console.error('Error: User data is missing');
            this.router.navigate(['']);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error(error);
          this.loading = false;
        }
      })
    );
  }

  private updateFormWithUserData(user: User) {
    const formattedBirthday = user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '';
    this.updateForm.patchValue({
      inputUserName: user.userName,
      inputFirstName: user.firstName,
      inputLastName: user.lastName,
      inputOrganizationName: user.organizationName,
      inputCountryAddress: user.countryAddress || '',
      inputStateAddress: user.stateAddress || '',
      inputEmailAddress: user.emailAddress,
      inputPhoneNumber: user.phoneNumber,
      inputBirthday: formattedBirthday,
      inputRole: user.role,
      inputIdentification: user.identification,
      inputAdditionalInfo: user.additionalInfo,
    });
  }

  loadCountries() {
    if (this.countries.length === 0) {
      this.subscriptions.add(
        this.geoInfoService.getCountries().subscribe({
          next: (response) => {
            if (response && Array.isArray(response)) {
              this.countries = response.sort((a: Country, b: Country) => a.name.localeCompare(b.name));
            } else {
              console.error('Error: Countries data is not an array');
            }
          },
          error: (error) => {
            console.error('Error loading countries', error);
          }
        })
      );
    }
  }

  private loadCountriesAndStates(countryId: string) {
    this.loadCountries();
    this.filterStatesByCountry(countryId);
  }

  private filterStatesByCountry(countryId: string | undefined) {
    if (!countryId) {
      console.error('Country ID is undefined');
      return;
    }

    this.subscriptions.add(
      this.geoInfoService.getStatesByCountry(countryId).subscribe({
        next: (response) => {
          this.filteredStates = response;
          this.updateForm.get('inputStateAddress')?.setValue(this.user?.stateAddress || '');
        },
        error: (error) => {
          console.error('Error loading states', error);
        }
      })
    );
  }

  onCountryChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const countryId = selectElement.value;
    if (countryId) {
      this.filterStatesByCountry(countryId);
    } else {
      console.warn("Country ID is undefined");
    }
  }

  private createForm() {
    this.updateForm = this.formBuilder.group({
      inputUserName: [{ value: '', disabled: true }, Validators.required],
      inputFirstName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(25), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
      inputLastName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(25), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
      inputOrganizationName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
      inputEmailAddress: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      inputCountryAddress: ['', Validators.required],
      inputStateAddress: ['', Validators.required],
      inputPhoneNumber: ['', [Validators.required, Validators.pattern('[0-9]+')]],
      inputBirthday: ['', [Validators.required, this.validationService.validateDate.bind(this.validationService)]],
      inputRole: [{ value: '', disabled: true }, Validators.required],
      inputIdentification: ['', Validators.required],
      inputAdditionalInfo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(50), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
    });
  }

  update() {
    if (this.updateForm.invalid) {
      this.markFormGroupTouched(this.updateForm);
      this.toastService.showToast('error', 'There are errors on the form. Please check the fields.');
      return;
    }

    const formData = this.createFormData();
    this.subscriptions.add(
      this.userManagementService.updateUser(formData, this.user?._id || '').subscribe({
        next: () => {
          this.toastService.showToast('success', 'Profile updated successfully.');
        },
        error: () => {
          this.toastService.showToast('error', 'Update failed');
        }
      })
    );
  }

  private createFormData(): FormData {
    const formData = new FormData();
    formData.append('_id', this.user?._id || '');
    Object.keys(this.updateForm.controls).forEach(key => {
      formData.append(key, this.updateForm.get(key)?.value);
    });
    return formData;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }
}




// import { Component, OnDestroy, OnInit } from '@angular/core';
// import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { Router } from '@angular/router';
// import { Subscription } from 'rxjs';
// import { AuthService } from 'src/app/core/services/auth.service';
// import { ToastService } from 'src/app/shared/services/toast.service';
// import { User } from 'src/app/core/interfaces/user.interface';
// import { GeoInfoService } from 'src/app/shared/services/geo-info.service';
// import { ValidationService } from 'src/app/core/services/validation.service';
// import { UserManagementService } from 'src/app/core/services/user-management.service';
// import { Country } from 'src/app/core/interfaces/country.interface';
// import { State } from 'src/app/core/interfaces/state.interface';

// @Component({
//   selector: 'app-profile',
//   templateUrl: './profile.component.html',
//   styleUrls: ['./profile.component.css'],
// })
// export class ProfileComponent implements OnInit, OnDestroy {
//   updateForm!: FormGroup;
//   user: User | null = null;
//   countries: Country[] = [];
//   states: State[] = [];
//   filteredStates: State[] = [];
//   loading: boolean = false;
//   private subscriptions = new Subscription();

//   constructor(
//     private router: Router,
//     private formBuilder: FormBuilder,
//     private authService: AuthService,
//     private toastService: ToastService,
//     private geoInfoService: GeoInfoService,
//     private validationService: ValidationService,
//     private userManagementService: UserManagementService
//   ) {
//     this.createForm();
//   }

//   ngOnInit(): void {
//     this.subscriptions.add(
//       this.userManagementService.user$.subscribe(user => {
//         if (user) {
//           this.user = user;
//           this.updateFormWithUserData(this.user);
//           if (this.user.countryAddress) {
//             this.loadCountriesAndStates(this.user.countryAddress);
//           }
//         } else {
//           this.router.navigate(['']);
//         }
//       })
//     );
//     this.fetchUserData();
//   }

//   ngOnDestroy(): void {
//     this.subscriptions.unsubscribe();
//   }

//   fetchUserData() {
//     this.loading = true;
//     this.subscriptions.add(
//       this.userManagementService.getUser().subscribe({
//         next: (response) => {
//           if (response?.data) {
//             this.user = response.data;
//             this.updateFormWithUserData(this.user);
//             if (this.user.countryAddress) {
//               this.loadCountriesAndStates(this.user.countryAddress);
//             }
//           } else {
//             console.error('Error: User data is missing');
//             this.router.navigate(['']);
//           }
//           this.loading = false;
//         },
//         error: (error) => {
//           console.error(error);
//           this.loading = false;
//         }
//       })
//     );
//   }

//   private updateFormWithUserData(user: User) {
//     const formattedBirthday = user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '';
//     this.updateForm.patchValue({
//       inputUserName: user.userName,
//       inputFirstName: user.firstName,
//       inputLastName: user.lastName,
//       inputOrganizationName: user.organizationName,
//       inputCountryAddress: user.countryAddress || '',
//       inputStateAddress: user.stateAddress || '',
//       inputEmailAddress: user.emailAddress,
//       inputPhoneNumber: user.phoneNumber,
//       inputBirthday: formattedBirthday,
//       inputRole: user.role,
//       inputIdentification: user.identification,
//       inputAdditionalInfo: user.additionalInfo,
//     });
//   }

  // loadCountries() {
  //   if (this.countries.length === 0) {
  //     this.subscriptions.add(
  //       this.geoInfoService.getCountries().subscribe({
  //         next: (response) => {
  //           if (response?.data && Array.isArray(response.data)) {
  //             this.countries = response.data.sort((a: Country, b: Country) => a.name.localeCompare(b.name));
  //           } else {
  //             console.error('Error: Countries data is not an array');
  //           }
  //         },
  //         error: (error) => {
  //           console.error('Error loading countries', error);
  //         }
  //       })
  //     );
  //   }
  // }

//   private loadCountriesAndStates(countryId: string) {
//     this.loadCountries();
//     this.filterStatesByCountry(countryId);
//   }

//   private filterStatesByCountry(countryId: string | undefined) {
//     if (!countryId) {
//       console.error('Country ID is undefined');
//       return;
//     }

//     this.subscriptions.add(
//       this.geoInfoService.getStatesByCountry(countryId).subscribe({
//         next: (response) => {
//           if (response?.data && Array.isArray(response.data)) {
//             this.filteredStates = response.data.sort((a: State, b: State) => a.province_name.localeCompare(b.province_name));
//             this.updateForm.get('inputStateAddress')?.setValue(this.user?.stateAddress || '');
//           } else {
//             console.error('Error: States data is not an array');
//           }
//         },
//         error: (error) => {
//           console.error('Error loading states', error);
//         }
//       })
//     );
//   }

//   onCountryChange(event: Event) {
//     const selectElement = event.target as HTMLSelectElement;
//     const countryId = selectElement.value;
//     if (countryId) {
//       this.filterStatesByCountry(countryId);
//     } else {
//       console.warn("Country ID is undefined");
//     }
//   }

//   private createForm() {
//     this.updateForm = this.formBuilder.group({
//       inputUserName: [{ value: '', disabled: true }, Validators.required],
//       inputFirstName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(25), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
//       inputLastName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(25), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
//       inputOrganizationName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
//       inputEmailAddress: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
//       inputCountryAddress: ['', Validators.required],
//       inputStateAddress: ['', Validators.required],
//       inputPhoneNumber: ['', [Validators.required, Validators.pattern('[0-9]+')]],
//       inputBirthday: ['', [Validators.required, this.validationService.validateDate.bind(this.validationService)]],
//       inputRole: [{ value: '', disabled: true }, Validators.required],
//       inputIdentification: ['', Validators.required],
//       inputAdditionalInfo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(50), Validators.pattern('^[a-zA-Z0-9\\sñÑ]+$')]],
//     });
//   }

//   update() {
//     if (this.updateForm.invalid) {
//       this.markFormGroupTouched(this.updateForm);
//       this.toastService.showToast('error', 'There are errors on the form. Please check the fields.');
//       return;
//     }

//     const formData = this.createFormData();
//     this.subscriptions.add(
//       this.userManagementService.updateUser(formData, this.user?._id || '').subscribe({
//         next: () => {
//           this.toastService.showToast('success', 'Profile updated successfully.');
//         },
//         error: () => {
//           this.toastService.showToast('error', 'Update failed');
//         }
//       })
//     );
//   }

//   private createFormData(): FormData {
//     const formData = new FormData();
//     formData.append('_id', this.user?._id || '');
//     Object.keys(this.updateForm.controls).forEach(key => {
//       formData.append(key, this.updateForm.get(key)?.value);
//     });
//     return formData;
//   }

//   private markFormGroupTouched(formGroup: FormGroup) {
//     Object.values(formGroup.controls).forEach(control => {
//       control.markAsTouched();
//     });
//   }
// }
