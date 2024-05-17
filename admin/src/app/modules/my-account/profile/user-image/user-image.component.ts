// Angular core and related imports
import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

// RxJS imports
import { Observable } from 'rxjs';

// Application-specific interfaces
import { User } from 'src/app/core/interfaces/user.interface';

// Configuration and services
import { GLOBAL } from 'src/app/core/config/GLOBAL';
import { AuthService } from 'src/app/core/services/auth.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { UserManagementService } from 'src/app/core/services/user-management.service';

@Component({
  selector: 'app-user-image',
  templateUrl: './user-image.component.html',
  styleUrls: ['./user-image.component.css']
})
export class UserImageComponent implements OnInit {
  @Input() profileImage!: string;
  imageUrl!: SafeUrl;
  @Output() imageUpdated = new EventEmitter<void>();
  @ViewChild('fileInput') fileInput!: ElementRef;

  selectedFile: File | null = null;
  userId: string = '';
  updateForm: FormGroup;

  constructor(
    private _formBuilder: FormBuilder,
    private _authService: AuthService,
    private _toastService: ToastService,
    private _userManagementService: UserManagementService,
    private _sanitizer: DomSanitizer
  ) {
    this.updateForm = this._formBuilder.group({
      inputProfileImage: [''],
    });
  }

  ngOnInit(): void {
    this.loadUserData();
  }

  setImageAsDefault(): void {
    this.imageUrl = 'assets/img/illustrations/profiles/profile-0.png';
  }

  loadUserData(): void {
    this._userManagementService.getUser().subscribe({
      next: (response) => {
        if (response && response.data && response.data._id) {
          this.userId = response.data._id; // Asegurando que _id no es undefined
          if (response.data.profileImage) {
            this.loadImage(response.data.profileImage);
          } else {
            this.setImageAsDefault();
          }
        } else {
          this.setImageAsDefault();
        }
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        this._toastService.showToast('error', 'Error loading user data');
        this.setImageAsDefault();
      }
    });
  }





  loadImage(profileImage: string): void {
    this._userManagementService.getUserImageUrl(profileImage).subscribe(
      imageBlob => {
        const objectUrl = window.URL.createObjectURL(imageBlob);
        this.imageUrl = this._sanitizer.bypassSecurityTrustUrl(objectUrl);
      },
      error => {
        console.error('Failed to load image:', error);
        this._toastService.showToast('error', 'Failed to load image');
        this.setImageAsDefault();
      }
    );
  }



  fileChangeEvent(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      if (!this.selectedFile) {
        this.setImageAsDefault();
      }
    }
  }


  uploadImage(): void {
    if (!this.selectedFile || !this.userId) {
      this._toastService.showToast('error', 'Please select an image to upload and ensure user is loaded.');
      return;
    }

    const formData = new FormData();
    formData.append('profileImage', this.selectedFile, this.selectedFile.name);

    this._userManagementService.updateProfileImage(this.userId, formData).subscribe({
      next: (response) => {
        this._toastService.showToast('success', 'Profile image has been successfully updated.');
        this.imageUpdated.emit();
        this.loadImage(response.data.profileImage); // Asumiendo que el backend responde con la nueva imagen
        this.selectedFile = null;
      },
      error: (error) => {
        console.error('Failed to update image:', error);
        this._toastService.showToast('error', 'Image upload failed.');
      }
    });
  }

}
