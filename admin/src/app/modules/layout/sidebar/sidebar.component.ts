import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';
import { UIBootstrapService } from 'src/app/core/services/uibootstrap.service';
import { UserManagementService } from "src/app/core/services/user-management.service";
import { FeatherIconsService } from 'src/app/core/services/feather-icons.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  public user: any = { data: {} };

  constructor(
    private _authService: AuthService,
    private _uiBootstrapService: UIBootstrapService,
    private _userManagementService: UserManagementService,
    private _featherIconsService: FeatherIconsService
  ) { }

  ngOnInit(): void {
    this._uiBootstrapService.closeSideNavigationOnWidthChange();
    this._uiBootstrapService.toggleSideNavigation();
    this._featherIconsService.activateFeatherIcons();
    this.fetchUserData();
  }

  fetchUserData() {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      this.user.data = JSON.parse(userData);
    } else {
      // Aquí puedes manejar el caso de no encontrar datos del usuario
      // Por ejemplo, redirigiendo al login o mostrando un mensaje
      console.error('No user data found in sessionStorage');
      // Redirigir al login o manejar de otra manera si es necesario
       this._authService.logout(); // Si decides desloguear al usuario
    }
  }
}