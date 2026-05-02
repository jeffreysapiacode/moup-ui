import { Component, signal } from '@angular/core';
import {Main} from './main/main';
import {MediaPlayer} from './main/media-player/media-player';

@Component({
  selector: 'app-root',
  imports: [Main],
  templateUrl: './app.html',
  styleUrl: './app.sass'
})
export class App {
}
