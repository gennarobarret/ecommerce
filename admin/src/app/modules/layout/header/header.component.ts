import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { Router } from "@angular/router";
import { FeatherIconsService } from 'src/app/core/services/feather-icons.service';
import { UserManagementService } from 'src/app/core/services/user-management.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  user: any = { data: {} };
  imageUrl: any;

  constructor(
    private _authService: AuthService,
    private _router: Router,
    private _featherIconsService: FeatherIconsService,
    private _userManagementService: UserManagementService,
    private _sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.fetchUserData();
  }

  fetchUserData(): void {
    this._userManagementService.getUser().subscribe(
      (response) => {
        if (!response || !response.data) {
          console.error('Error: User data is missing');
          this.logout();
          return;
        }
        if (response.data.profileImage) {
          if (response.data.profileImage.startsWith('http')) {
            this.imageUrl = this._sanitizer.bypassSecurityTrustUrl(response.data.profileImage);
          } else {
            this.loadUserImage(response.data.profileImage);
          }
        } else {
          this.setImageAsDefault();
        }
      },
      (error) => {
        console.error(error);
      }
    );
  }


  private loadUserImage(profileImage: string): void {
    this._userManagementService.getUserImageUrl(profileImage).subscribe(url => {
      this.imageUrl = this._sanitizer.bypassSecurityTrustUrl(url);
    }, error => {
      console.error('Error loading the user image:', error);
      this.setImageAsDefault();
    });
  }

  private setImageAsDefault(): void {
    this.imageUrl = 'assets/img/illustrations/profiles/profile-0.png';
  }


  displayFullName(): string {
    const { firstName, lastName } = this.user.data;
    let nameParts = [];
    if (firstName && firstName !== 'notSpecified') {
      nameParts.push(firstName);
    }
    if (lastName && lastName !== 'notSpecified') {
      nameParts.push(lastName);
    }
    return nameParts.join(', ');
  }


  logout(): void {
    this._authService.logout();
  }

  accountSetting(): void {
    this._router.navigate(['/account-settings/profile']);
  }

}

// fetchUserData(): void {
//   this._featherIconsService.activateFeatherIcons();
//   const userData = sessionStorage.getItem('userData');
//   if (userData) {
//     this.user.data = JSON.parse(userData);
//     if (this.user.data.profileImage) {
//       if (this.user.data.profileImage.startsWith('http')) {
//         this.imageUrl = this._sanitizer.bypassSecurityTrustUrl(this.user.data.profileImage);
//       } else {
//         this.loadUserImage(this.user.data.profileImage);
//       }
//     } else {
//       // Establece imagen por defecto si no hay imagen de perfil
//       this.setImageAsDefault();
//     }
//   } else {
//     this.logout();
//   }
// }