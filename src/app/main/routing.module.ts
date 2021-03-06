import { IntroContainer } from './containers/intro/intro.container';
import { LogoPageContainer } from './containers/logo-page/logo-page.container';
import { MainMenuContainer } from './containers/main-menu/main-menu.container';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppUsersMetaResolver } from './guards/app-users-meta.resolver';
import { AppUsersResolver } from './guards/app-users.resolver';
import { PermissionGuard } from '../core/guards/permission.guard';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: LogoPageContainer
      },
      {
        path: 'main-menu',
        component: MainMenuContainer
      },
      {
        path: 'intro',
        component: IntroContainer
      }
    ])
  ],
  exports: [
    RouterModule
  ]
})
export class RoutingModule { }
