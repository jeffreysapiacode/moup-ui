import { Routes } from '@angular/router';
import {Main} from './main/main';

export const routes: Routes = [
  { path: '', component: Main },
  { path: 'play', component: Main },
  { path: '**', redirectTo: '/', pathMatch: 'full' }
];
