import { Component, OnInit, Input } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { Router } from "@angular/router";
import { FeatherIconsService } from 'src/app/core/services/feather-icons.service';
import { User } from "src/app/core/interfaces/user.interface";
import { GLOBAL } from "src/app/core/config/GLOBAL";



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  url = GLOBAL.url;
  isCollapsed = true;
  user: any = { data: {} };
  imageUrl: any | ArrayBuffer = 'assets/img/illustrations/profiles/profile-2.png';


  constructor(
    private _authService: AuthService,
    private _router: Router,
    private _featherIconsService: FeatherIconsService,
  ) { }


  ngOnInit(): void {
    this.fetchUserData();
  }

  fetchUserData() {
    this._featherIconsService.activateFeatherIcons();
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      this.user.data = JSON.parse(userData);
    } else {
      this.logout();
    }
  }

  getImageUrl(profileImagePath: string): string {
    if (profileImagePath.startsWith('http')) {
      return profileImagePath;
    } else {
      return `${this.url}geUserImage/${profileImagePath}`;
    }
  }

  logout(): void {
    this._authService.logout();
  }

  accountSetting(): void {
    this._router.navigate(['/account-settings/profile']);
  }

}
