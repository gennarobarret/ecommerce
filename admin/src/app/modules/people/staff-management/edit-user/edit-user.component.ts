import { Component } from "@angular/core";
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { AuthService } from "src/app/core/services/auth.service";
import { ToastService } from "src/app/shared/services/toast.service";
import { User } from "src/app/core/interfaces/user.interface";
import { GeoInfoService } from "src/app/shared/services/geo-info.service";
import { ValidationService } from "src/app/core/services/validation.service";
import { GLOBAL } from "src/app/core/config/GLOBAL";
import { Renderer2, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { Country } from "src/app/core/interfaces/country.interface";
import { State } from "src/app/core/interfaces/state.interface";
import { UserManagementService } from "src/app/core/services/user-management.service";

@Component({
  selector: 'app-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.css'],
})
export class EditUserComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;

  updateForm!: FormGroup;
  groups!: FormGroup;
  id: string = '';
  url = GLOBAL.url;
  userProfile: any = {};
  user: User | null = null;
  countries: Country[] = [];
  states: State[] = [];
  filteredStates: State[] = [];
  load_data: boolean = false;
  load_btn: boolean = false;
  imageUrl: any | ArrayBuffer = 'assets/img/illustrations/profiles/profile-2.png';
  selectedFile: File | null = null;
  allGroups: string[] = ['Managers', 'Developers', 'Marketing', 'Sales', 'Customer'];

  private userName: string = '';
  private userId: string = '';
  public userRole: string = '';
  private userGroups: [] = [];
  private userIdentification: string = '';
  private userEmailAddress: string = '';
  private subscriptions = new Subscription();

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _formBuilder: FormBuilder,
    private _renderer: Renderer2,
    private _authService: AuthService,
    private _toastService: ToastService,
    private _geoInfoService: GeoInfoService,
    private _validationService: ValidationService,
    private _userManagementService: UserManagementService
  ) {
    this.updateForm = this._formBuilder.group({
      inputUserName: [{ value: '', disabled: true }, Validators.required],
      inputFirstName: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(25),
          Validators.pattern("^[a-zA-Z0-9\\sñÑ]+$")
        ]
      ],
      inputLastName: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(25),
          Validators.pattern("^[a-zA-Z0-9\\sñÑ]+$")
        ]
      ],
      inputOrganizationName: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30),
          Validators.pattern("^[a-zA-Z0-9\\sñÑ]+$")
        ]
      ],
      inputEmailAddress: [{ value: "", disabled: true }, [Validators.required, Validators.email]],
      inputCountryAddress: ["", [Validators.required]],
      inputStateAddress: ["", [Validators.required]],
      inputPhoneNumber: [
        "",
        [Validators.required, Validators.pattern("[0-9]+")]
      ],
      inputBirthday: [
        "",
        [Validators.required, this._validationService.validateDate.bind(this)]
      ],
      inputRole: [{ value: "", disabled: true }, [Validators.required]],
      groups: this._formBuilder.array([]),
      inputIdentification: [
        { value: "", disabled: true },
        [Validators.required]
      ],
      inputAdditionalInfo: [
        "",
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(50),
          Validators.pattern("^[a-zA-Z0-9\\sñÑ]+$")
        ]
      ],
      inputProfileImage: [""]
    });

  }

  ngOnInit(): void {
    this.getRouteParams();
    this.fetchUserData();
    this.loadCountries();
  }

  getRouteParams() {
    this._route.params.subscribe((params) => {
      this.id = params['id'];
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  fetchUserData() {
    this.load_data = true;
    const userActiveProfile = sessionStorage.getItem('userData');
    if (userActiveProfile) {
      this.userProfile = JSON.parse(userActiveProfile);
      // console.log("🚀 ~ EditUserComponent ~ fetchUserData ~ JSON.parse(userActiveProfile):", this.userProfile);
      this.load_data = false;
    } else {
      console.error('No user data found in sessionStorage');
      this._authService.logout();
    }
    this.fetchUserDetails();

  }

  private fetchUserDetails() {
    this._userManagementService.getUserById(this.id).subscribe(
      response => {
        if (response.data === undefined) {
          this._router.navigate([""]);
        } else {
          this.user = response.data as User;
          console.log("🚀 ~ EditUserComponent ~ fetchUserDetails ~ this.user :", this.user)
          // console.log("🚀 Grupos del usuario:", this.user.groups);
          if (!this.id) {
            console.error('Error: _id is missing from the user data');
            return;
          }
          this.userId = this.id;
          this.userName = this.user.userName;
          this.userRole = this.user.role;
          this.userEmailAddress = this.user.emailAddress;
          this.userIdentification = this.user.identification || '';

          this.initFormGroups();
          this.configureFormBasedOnUserRole();
          this.updateFormWithUserData(this.user);
          this.filterStatesByCountry(this.user.countryAddress);
          this.load_data = false;
        }
      },
      error => {
        console.error(error);
      }
    );
  }

  private initFormGroups(): void {
    const groupControls = this.allGroups.map(group => {
      const isSelected = this.user?.groups?.includes(group) ?? false;
      return this._formBuilder.control(isSelected);
    });
    const groupsFormArray = this._formBuilder.array(groupControls);
    this.updateForm.setControl('groups', groupsFormArray);

  }

  configureFormBasedOnUserRole() {
    const groupsControl = this.updateForm.get('groups');
    if (groupsControl) {
      if (this.userProfile.role !== 'MasterAdministrator') {
        groupsControl.disable();
      } else {
        groupsControl.enable();
      }
    }
  }

  get groupsControls() {
    return (this.updateForm.get('groups') as FormArray).controls;
  }

  getImageUrl(profileImagePath: string): string {
    if (profileImagePath.startsWith('http')) {
      return profileImagePath;
    } else {
      return `${this.url}getUserImage/${profileImagePath}`;
    }
  }

  private updateFormWithUserData(userData: User) {
    let formattedBirthday = '';
    if (userData.birthday) {
      const birthdayDate = new Date(userData.birthday);
      if (!isNaN(birthdayDate.getTime())) {
        formattedBirthday = birthdayDate.toISOString().split('T')[0];
      }
    }
    if (userData.profileImage && userData.profileImage.trim() !== '') {
      this.imageUrl = this.url + 'getUserImage/' + userData.profileImage;
    } else {
      this.imageUrl = 'assets/img/illustrations/random-profiles/profile-2.png';
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
      inputCreatedAt: userData.createdAt,
      inputUpdatedAt: userData.updatedAt,
    });
  }

  private loadCountries() {
    this._geoInfoService.getCountries().subscribe(
      data => {
        console.log("🚀 ~ EditUserComponent ~ loadCountries ~ data:", data)
        this.countries = data.sort((a: Country, b: Country) =>
          a.name.localeCompare(b.name)
        );
        this.loadStates();
      },
      error => {
        console.error("Error loading countries", error);
      }
    );
  }

  private loadStates() {
    this._geoInfoService.getStates().subscribe(
      data => {
        this.states = data.sort((a: State, b: State) =>
          a.province_name.localeCompare(b.province_name)
        );
      },
      error => {
        console.error("Error loading states", error);
      }
    );
  }

  filterStatesByCountry(countryId: string | number) {
    const numericCountryId = Number(countryId);
    this.filteredStates = this.states.filter(
      state => state.country_id === numericCountryId
    );
    const stateControl = this.updateForm.get("inputState");
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
      stateControl.setValue("");
    }
  }

  fileChangeEvent(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      this.selectedFile = inputElement.files[0];
      this.validateAndUpdateImg(this.selectedFile);
    }
  }

  private validateAndUpdateImg(file: File) {
    if (!this.imageUrl && !file) {
      this.updateForm.get('inputProfileImage')!.setErrors({ required: true });
      return;
    }
    if (file) {
      const errors = this.validateFileUpdate(file);
      if (errors) {
        this.updateForm.get('inputProfileImage')!.setErrors(errors);
      }
    }
  }

  private validateFileUpdate(file: File): { [key: string]: any } | null {
    if (file) {
      const validTypes = ['image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/jpeg'];
      if (validTypes.includes(file.type)) {
        if (file.size <= 4000000) {
          let reader = new FileReader();
          reader.readAsDataURL(file);

          reader.onload = () => {
            if (reader.result !== null) {
              this.imageUrl = reader.result as string;
              this.updateForm.patchValue({
                file: reader.result
              });
            }
          }
          return null;
        } else {
          console.error('error', 'The image cannot exceed 4 mb');
          this._toastService.showToast('error', 'The image cannot exceed 4 mb');
          return { invalidFileSize: true };
        }
      } else {
        console.error('The file must be a PNG, WEBP, JPG, GIF, or JPEG image.');
        this._toastService.showToast('error', 'The file must be a PNG, WEBP, JPG, GIF, or JPEG image.');
        return { invalidFileType: true };
      }
    }

    return null;
  }

  triggerFileInput(): void {
    this._renderer.selectRootElement(this.fileInput.nativeElement).click();
  }

  update() {
    if (this.updateForm.invalid) {
      for (const control of Object.keys(this.updateForm.controls)) {
        this.updateForm.controls[control].markAsTouched();
      }
      this.load_btn = false;
      this._toastService.showToast('error', 'There are errors on the form. Please check the fields.');
      return;
    }

    this.load_btn = true;
    const formData = new FormData();
    formData.append('_id', this.userId);
    formData.append('userName', this.userName);
    formData.append('role', this.userRole);
    formData.append('identification', this.userIdentification);
    formData.append('firstName', this.updateForm.value.inputFirstName);
    formData.append('lastName', this.updateForm.value.inputLastName);
    formData.append('organizationName', this.updateForm.value.inputOrganizationName);
    formData.append('emailAddress', this.userEmailAddress);
    formData.append('countryAddress', this.updateForm.value.inputCountryAddress);
    formData.append('stateAddress', this.updateForm.value.inputStateAddress);
    formData.append('phoneNumber', this.updateForm.value.inputPhoneNumber);
    formData.append('birthday', this.updateForm.value.inputBirthday);
    formData.append('additionalInfo', this.updateForm.value.inputAdditionalInfo);
    if (this.selectedFile) {
      formData.append('profileImage', this.selectedFile);
    }
    if (this.updateForm.value.groups) {
      const selectedGroups = this.updateForm.value.groups
        .map((checked: boolean, i: number) => checked ? this.allGroups[i] : null)
        .filter((v: string | null) => v !== null);
      formData.append('groups', JSON.stringify(selectedGroups));
    }
    formData.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });

    // this._userManagementService.updateUser(formData, this.userId).subscribe({
    //   next: (response) => {
    //     this._toastService.showToast('success', 'New profile data has been successfully updated.');
    //     this.load_btn = false;
    //   },
    //   error: (error) => {
    //     this._toastService.showToast('error', 'Update failed');
    //     this.load_btn = false;
    //     // this._router.navigate(['/dashboard']);
    //   }
    // });

  }
}